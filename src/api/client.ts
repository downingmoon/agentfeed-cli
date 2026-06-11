import type { AgentFeedCredentials, CliAuthExchangeResult, CliAuthSession, LocalDraft } from '../types.js';
import type { ApiMetadata } from './metadata.js';
export type { ApiMetadata } from './metadata.js';
import { readDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import { shortHash } from '../utils/hash.js';
import { AgentFeedApiError } from './errors.js';
import { parseCheckData, parseIngestionTokenStatusResponse, type IngestionTokenStatus } from './ingestion-token-status.js';
import { draftToIngestRequest } from './ingest-request.js';
import { apiErrorResponseSummary, parseApiErrorEnvelope, readResponseJson, responseDataEnvelope } from './response-contract.js';
import { parseMetadataResponse } from './metadata-response.js';
import { CACHED_PRIVATE_REVIEW_UPLOAD_STATUS, parsePublishDraftResult, parseRemotePreviewResult, worklogIdFromReviewUrl, type PublishDraftResult, type RemotePreviewResult } from './publish-response.js';
export type { PublishDraftResult, PublishDraftStatus, PublishDraftVisibility, RemotePreviewPayload, RemotePreviewResult } from './publish-response.js';
import { parseCliAuthExchangeResult, parseCliAuthSession } from './cli-auth-response.js';
import { acquireDraftUploadLock } from './draft-upload-lock.js';
import { trustedReviewOrigin, validateReviewUrl } from './trusted-url.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';

export { AgentFeedApiError } from './errors.js';
export type { IngestionTokenStatus } from './ingestion-token-status.js';

export interface ApiCheckResult {
  ok: boolean;
  url: string;
  status?: number;
  error?: string;
  data?: IngestionTokenStatus;
}

export interface ApiCompatibilityCheckResult {
  ok: boolean;
  compatible: boolean;
  url: string;
  status?: number;
  error?: string;
  data?: ApiMetadata;
}

export const EXPECTED_API_VERSION = 'v1';
export const EXPECTED_API_CONTRACT_VERSION = '2026-06-03';

const DEFAULT_API_REQUEST_TIMEOUT_MS = 30_000;
const API_CHECK_TIMEOUT_MS = 3_000;
const DEFAULT_API_RETRY_ATTEMPTS = 3;
const DEFAULT_API_RETRY_BASE_DELAY_MS = 250;

function apiRequestTimeoutMs(): number {
  const configured = Number(process.env.AGENTFEED_API_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_API_REQUEST_TIMEOUT_MS;
}

function apiRetryAttempts(): number {
  const configured = Number(process.env.AGENTFEED_API_RETRY_ATTEMPTS);
  if (!Number.isFinite(configured)) return DEFAULT_API_RETRY_ATTEMPTS;
  return Math.max(1, Math.min(5, Math.floor(configured)));
}

function apiRetryBaseDelayMs(): number {
  const configured = Number(process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_API_RETRY_BASE_DELAY_MS;
}

function apiUrl(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`;
}

function healthUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  url.pathname = '/health/ready';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function errorCauseChain(error: unknown): Array<Record<string, unknown>> {
  const chain: Array<Record<string, unknown>> = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === 'object' && !seen.has(current) && chain.length < 6) {
    seen.add(current);
    chain.push(current as Record<string, unknown>);
    current = (current as { cause?: unknown }).cause;
  }
  return chain;
}

function diagnosticStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined;
}

function diagnosticHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function describeNetworkFailure(error: unknown, url: string, timeoutMs: number): string {
  const host = diagnosticHostFromUrl(url);
  const chain = errorCauseChain(error);
  const codes = chain.map(item => diagnosticStringField(item.code)).filter((value): value is string => Boolean(value));
  const names = chain.map(item => diagnosticStringField(item.name)).filter((value): value is string => Boolean(value));
  const messages = chain.map(item => diagnosticStringField(item.message)).filter((value): value is string => Boolean(value));
  const text = [...codes, ...names, ...messages].join(' ').toLowerCase();

  if (text.includes('aborterror') || text.includes('aborted')) {
    return `request timed out for ${host} after ${timeoutMs}ms. Check API availability or tune AGENTFEED_API_TIMEOUT_MS.`;
  }
  if (codes.some(code => code === 'ENOTFOUND' || code === 'EAI_AGAIN') || text.includes('getaddrinfo') || text.includes('dns')) {
    return `DNS lookup failed for ${host}. Check AGENTFEED_API_BASE_URL or hosted DNS/deployment.`;
  }
  if (codes.some(code => code === 'ECONNREFUSED')) {
    return `connection refused for ${host}. Check that the AgentFeed API is running and reachable.`;
  }
  if (codes.some(code => code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') || text.includes('timed out') || text.includes('timeout')) {
    return `connection timed out for ${host}. Check API availability or tune AGENTFEED_API_TIMEOUT_MS.`;
  }
  if (
    codes.some(code => code.startsWith('CERT_') || code.startsWith('ERR_TLS') || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'SELF_SIGNED_CERT_IN_CHAIN')
    || text.includes('certificate')
    || text.includes('tls')
    || text.includes('ssl')
  ) {
    return `TLS/certificate verification failed for ${host}. Check the hosted API certificate configuration.`;
  }

  const message = messages.find(value => value !== 'fetch failed') ?? messages[0];
  return message ?? 'unreachable';
}

async function fetchCheck(url: string, init: RequestInit): Promise<ApiCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: response.ok, url, status: response.status, data: await parseCheckData(response) };
  } catch (error) {
    return { ok: false, url, error: describeNetworkFailure(error, url, API_CHECK_TIMEOUT_MS) };
  } finally {
    clearTimeout(timer);
  }
}

function parseSemverParts(value: string): [number, number, number] | undefined {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(left: string, right: string): number | undefined {
  const leftParts = parseSemverParts(left);
  const rightParts = parseSemverParts(right);
  if (!leftParts || !rightParts) return undefined;
  for (let index = 0; index < 3; index += 1) {
    const a = leftParts[index];
    const b = rightParts[index];
    if (a !== b) return a > b ? 1 : -1;
  }
  return 0;
}

export function apiMetadataCompatible(metadata: ApiMetadata | undefined): boolean {
  if (!metadata) return false;
  const cli = metadata.supported_clients?.cli;
  return metadata.service === 'agentfeed-api'
    && metadata.api_version === EXPECTED_API_VERSION
    && metadata.contract_version === EXPECTED_API_CONTRACT_VERSION
    && trustedReviewOrigin(metadata.review_base_url) !== null
    && cli?.contract_version === EXPECTED_API_CONTRACT_VERSION
    && typeof cli.min_version === 'string'
    && (compareSemver(AGENTFEED_CLI_VERSION, cli.min_version) ?? -1) >= 0;
}

export async function checkApiReachability(apiBaseUrl: string): Promise<ApiCheckResult> {
  return fetchCheck(healthUrl(apiBaseUrl), { method: 'GET' });
}

export async function checkApiCompatibility(apiBaseUrl: string): Promise<ApiCompatibilityCheckResult> {
  const url = apiUrl(apiBaseUrl, '/metadata');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const parsed = await parseMetadataResponse(response);
    const compatible = response.ok && apiMetadataCompatible(parsed.data);
    return {
      ok: response.ok,
      compatible,
      url,
      status: response.status,
      data: parsed.data,
      error: compatible ? undefined : parsed.error ?? 'AgentFeed API compatibility metadata is missing or unsupported.'
    };
  } catch (error) {
    return {
      ok: false,
      compatible: false,
      url,
      error: describeNetworkFailure(error, url, API_CHECK_TIMEOUT_MS)
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkIngestionToken(credentials: AgentFeedCredentials): Promise<ApiCheckResult> {
  const url = apiUrl(credentials.api_base_url, '/ingest/status');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${credentials.ingestion_token}` },
      signal: controller.signal
    });
    const parsed = await parseIngestionTokenStatusResponse(response);
    if (!response.ok) {
      return {
        ok: false,
        url,
        status: response.status,
        data: parsed.data,
        error: parsed.error ?? 'AgentFeed API ingestion token check failed.'
      };
    }
    if (!parsed.data) {
      return {
        ok: false,
        url,
        status: response.status,
        error: parsed.error ?? 'AgentFeed API returned an invalid ingestion token status response.'
      };
    }
    return { ok: true, url, status: response.status, data: parsed.data };
  } catch (error) {
    return { ok: false, url, error: describeNetworkFailure(error, url, API_CHECK_TIMEOUT_MS) };
  } finally {
    clearTimeout(timer);
  }
}

export { draftToIngestRequest } from './ingest-request.js';

export function draftUploadPayloadHash(draft: LocalDraft): string {
  return shortHash(JSON.stringify(draftToIngestRequest(draft)), 32);
}

export function draftUploadCredentialBindingHash(credentials: AgentFeedCredentials): string {
  return shortHash(JSON.stringify({
    api_base_url: credentials.api_base_url,
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null,
    token_fingerprint: shortHash(credentials.ingestion_token, 16)
  }), 32);
}

function friendlyError(status: number, code: string, message: string, details?: Record<string, unknown>): string {
  if (status === 401 || code === 'INGESTION_TOKEN_INVALID') {
    return [
      'Login/token problem.',
      'Run: agentfeed rotate',
      'If AGENTFEED_TOKEN is set, update it in your shell or secret manager, or rotate saved credentials without the environment token:',
      'Run: unset AGENTFEED_TOKEN && agentfeed rotate --browser'
    ].join('\n');
  }
  if (status === 413 || code === 'INGESTION_PAYLOAD_TOO_LARGE') return 'Draft payload is too large. Local draft was kept.';
  if (status === 422 || code === 'VALIDATION_ERROR') return `Validation error: ${message}${details ? ` ${JSON.stringify(details)}` : ''}`;
  if (status === 429 || code === 'RATE_LIMITED') return `Rate limited.${details?.retry_after_seconds ? ` Retry after ${details.retry_after_seconds} seconds.` : ''}`;
  if (status === 409 || code === 'DUPLICATE_INGESTION_SESSION') return `Duplicate ingestion session.${details?.review_url ? ` Existing review URL: ${details.review_url}` : ''}`;
  if (status >= 500) return 'Server error. Local draft was kept.';
  return message || `AgentFeed API error (${status})`;
}

function networkErrorMessage(error: unknown, options: { localDraftKept?: boolean; url?: string; timeoutMs?: number } = {}): string {
  const reason = options.url
    ? ` ${describeNetworkFailure(error, options.url, options.timeoutMs ?? apiRequestTimeoutMs())}`
    : error instanceof Error && error.message ? ` ${error.message}` : '';
  return options.localDraftKept
    ? `Could not reach AgentFeed API. Local draft was kept.${reason}`
    : `Could not reach AgentFeed API.${reason}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, options: { localDraftKept?: boolean; timeoutMs?: number } = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? apiRequestTimeoutMs());
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new AgentFeedApiError(
        408,
        'API_REQUEST_TIMEOUT',
        options.localDraftKept
          ? 'AgentFeed API request timed out. Local draft was kept; rerun the same publish/share command to reconcile any server-side duplicate.'
          : 'AgentFeed API request timed out.'
      );
    }
    throw new AgentFeedApiError(0, 'API_REQUEST_FAILED', networkErrorMessage(error, { ...options, url, timeoutMs: options.timeoutMs ?? apiRequestTimeoutMs() }));
  } finally {
    clearTimeout(timer);
  }
}

function retryAfterMs(details?: Record<string, unknown>): number | null {
  const seconds = Number(details?.retry_after_seconds);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(2_000, seconds * 1000);
}

function isRetryableApiError(error: unknown): error is AgentFeedApiError {
  return error instanceof AgentFeedApiError
    && error.code !== 'API_RESPONSE_INVALID'
    && (error.status === 0 || error.status === 408 || error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  const attempts = apiRetryAttempts();
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableApiError(error)) throw error;
      const retryAfter = retryAfterMs(error.details);
      const delayMs = retryAfter ?? apiRetryBaseDelayMs() * (2 ** (attempt - 1));
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function postJson<T>(apiBaseUrl: string, path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithTimeout(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await readResponseJson(response, { successMessage: 'AgentFeed API returned an invalid JSON response.' });
  if (!response.ok) {
    const api = parseApiErrorEnvelope(data);
    if (!api) {
      throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid error response.');
    }
    const msg = friendlyError(response.status, api.code, api.message, api.details);
    throw new AgentFeedApiError(response.status, api.code, msg, api.details);
  }
  return responseDataEnvelope<T>(data, {
    successMessage: 'AgentFeed API response is missing the data envelope.',
    unexpectedFieldsMessage: 'AgentFeed API response has unexpected data envelope fields.'
  });
}

export async function createCliAuthSession(apiBaseUrl: string, input: { verifier: string; deviceName?: string; replaceTokenId?: string }): Promise<CliAuthSession> {
  const data = await postJson<unknown>(apiBaseUrl, '/auth/cli/sessions', {
    verifier: input.verifier,
    device_name: input.deviceName,
    replace_token_id: input.replaceTokenId
  });
  return parseCliAuthSession(data, apiBaseUrl);
}

export async function exchangeCliAuthSession(apiBaseUrl: string, sessionId: string, verifier: string): Promise<CliAuthExchangeResult> {
  return parseCliAuthExchangeResult(await postJson<unknown>(apiBaseUrl, `/auth/cli/sessions/${encodeURIComponent(sessionId)}/exchange`, { verifier }));
}

async function postIngest<T>(path: string, draft: LocalDraft, credentials: AgentFeedCredentials): Promise<T> {
  const payload = draftToIngestRequest(draft);
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body, 'utf8') > 512 * 1024) throw new AgentFeedApiError(413, 'INGESTION_PAYLOAD_TOO_LARGE', 'Draft payload is too large.');
  return withTransientRetry(async () => {
    const response = await fetchWithTimeout(apiUrl(credentials.api_base_url, path), {
      method: 'POST',
      headers: { authorization: `Bearer ${credentials.ingestion_token}`, 'content-type': 'application/json' },
      body
    }, { localDraftKept: true });
    const data = await readResponseJson(response, { successMessage: 'AgentFeed API returned an invalid JSON upload response.', localDraftKept: true });
    if (!response.ok) {
      const api = parseApiErrorEnvelope(data);
      if (!api) {
        throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid error response. Local draft was kept.');
      }
      const retryAfterHeader = Number(response.headers.get('retry-after'));
      const details = Number.isFinite(retryAfterHeader) && retryAfterHeader >= 0 && api.details.retry_after_seconds == null
        ? { ...api.details, retry_after_seconds: retryAfterHeader }
        : api.details;
      const msg = friendlyError(response.status, api.code, api.message, details);
      throw new AgentFeedApiError(response.status, api.code, msg, details);
    }
    return responseDataEnvelope<T>(data, {
      successMessage: 'AgentFeed API upload response is missing the data envelope.',
      unexpectedFieldsMessage: 'AgentFeed API upload response has unexpected data envelope fields.',
      localDraftKept: true
    });
  });
}


export async function previewDraftRemote(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<RemotePreviewResult> {
  return parseRemotePreviewResult(await postIngest<unknown>('/ingest/worklogs/preview', draft, credentials));
}

export async function uploadDraft(draft: LocalDraft, credentials: AgentFeedCredentials, reviewBaseUrl?: string | null): Promise<PublishDraftResult> {
  return parsePublishDraftResult(await postIngest<unknown>('/ingest/worklogs', draft, credentials), credentials.api_base_url, reviewBaseUrl);
}

export function isTrustedReviewUrl(reviewUrl: string, apiBaseUrl: string, reviewBaseUrl?: string | null): boolean {
  return validateReviewUrl(reviewUrl, apiBaseUrl, reviewBaseUrl);
}

export type CachedUploadReuseFailureReason =
  | 'missing_upload_marker'
  | 'missing_worklog_id'
  | 'missing_review_url'
  | 'missing_payload_hash'
  | 'missing_credential_binding'
  | 'base_url_mismatch'
  | 'invalid_review_url'
  | 'payload_hash_mismatch'
  | 'credential_binding_mismatch';

export type CachedUploadReuseStatus =
  | { reusable: true }
  | { reusable: false; reason: CachedUploadReuseFailureReason; canRetry: true };

export function cachedUploadReuseStatusForCredentials(draft: LocalDraft, credentials: AgentFeedCredentials): CachedUploadReuseStatus {
  if (!draft.upload.uploaded) return { reusable: false, reason: 'missing_upload_marker', canRetry: true };
  if (!draft.upload.worklog_id) return { reusable: false, reason: 'missing_worklog_id', canRetry: true };
  if (!draft.upload.review_url) return { reusable: false, reason: 'missing_review_url', canRetry: true };
  if (!draft.upload.payload_hash) return { reusable: false, reason: 'missing_payload_hash', canRetry: true };
  if (!draft.upload.credential_binding_hash) return { reusable: false, reason: 'missing_credential_binding', canRetry: true };
  if (draft.upload.api_base_url && draft.upload.api_base_url !== credentials.api_base_url) return { reusable: false, reason: 'base_url_mismatch', canRetry: true };

  const safeDraft = structuredClone(draft) as LocalDraft;
  scanAndRedactDraftPublicFields(safeDraft, { preserveResolvedFindings: true });
  try {
    parseCachedUploadResult(safeDraft, credentials.api_base_url);
  } catch {
    return { reusable: false, reason: 'invalid_review_url', canRetry: true };
  }
  if (safeDraft.upload.payload_hash !== draftUploadPayloadHash(safeDraft)) return { reusable: false, reason: 'payload_hash_mismatch', canRetry: true };
  if (safeDraft.upload.credential_binding_hash !== draftUploadCredentialBindingHash(credentials)) return { reusable: false, reason: 'credential_binding_mismatch', canRetry: true };
  return { reusable: true };
}

export function cachedUploadReusableForCredentials(draft: LocalDraft, credentials: AgentFeedCredentials): boolean {
  return cachedUploadReuseStatusForCredentials(draft, credentials).reusable;
}

function parseCachedUploadResult(draft: LocalDraft, apiBaseUrl: string): PublishDraftResult {
  return parsePublishDraftResult({
    id: draft.upload.worklog_id,
    status: CACHED_PRIVATE_REVIEW_UPLOAD_STATUS,
    visibility: 'private',
    review_url: draft.upload.review_url,
    created_at: draft.upload.uploaded_at ?? draft.source.created_at,
    reused_existing: true
  }, apiBaseUrl, draft.upload.review_base_url, { allowCachedStatus: true });
}

function staleCachedUploadError(draft: LocalDraft): AgentFeedApiError {
  return new AgentFeedApiError(
    409,
    'DRAFT_UPLOAD_STALE',
    'Saved private review no longer matches this local draft after privacy redaction. Keep reviewing the existing URL in the browser, or collect a fresh worklog before sharing again.',
    {
      worklog_id: draft.upload.worklog_id ?? null,
      review_url: draft.upload.review_url ?? null
    }
  );
}

function assertCachedUploadPayloadCurrent(draft: LocalDraft, currentPayloadHash: string): void {
  if (draft.upload.payload_hash === currentPayloadHash) return;
  throw staleCachedUploadError(draft);
}

function cachedUploadCredentialBindingMatches(draft: LocalDraft, credentials: AgentFeedCredentials): boolean {
  return draft.upload.credential_binding_hash === draftUploadCredentialBindingHash(credentials);
}

function uploadMetadataForCredentials(credentials: AgentFeedCredentials, reviewBaseUrl?: string | null): Pick<LocalDraft['upload'], 'api_base_url' | 'review_base_url' | 'credential_binding_hash' | 'token_id' | 'user_id'> {
  return {
    api_base_url: credentials.api_base_url,
    review_base_url: trustedReviewOrigin(reviewBaseUrl),
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null
  };
}

function detailString(details: Record<string, unknown> | undefined, key: string): string | null {
  const value = details?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function duplicateIngestResult(error: AgentFeedApiError, fallbackCreatedAt: string, apiBaseUrl: string, reviewBaseUrl?: string | null): PublishDraftResult | null {
  if (error.status !== 409 || error.code !== 'DUPLICATE_INGESTION_SESSION') return null;
  const reviewUrl = detailString(error.details, 'review_url');
  if (!reviewUrl) return null;
  const worklogId = detailString(error.details, 'worklog_id')
    ?? detailString(error.details, 'id')
    ?? worklogIdFromReviewUrl(reviewUrl);
  if (!worklogId) return null;
  const result = {
    id: worklogId,
    status: CACHED_PRIVATE_REVIEW_UPLOAD_STATUS,
    visibility: 'private',
    review_url: reviewUrl,
    created_at: detailString(error.details, 'created_at') ?? fallbackCreatedAt,
    reused_existing: true
  };
  try {
    return parsePublishDraftResult(result, apiBaseUrl, reviewBaseUrl, { allowCachedStatus: true });
  } catch {
    return null;
  }
}

export async function publishDraft(options: { cwd: string; id: string; credentials: AgentFeedCredentials; reviewBaseUrl?: string | null }): Promise<PublishDraftResult> {
  const uploadLock = await acquireDraftUploadLock(options.cwd, options.id);
  try {
    return await publishDraftWithLock(options, uploadLock.assertHeartbeatHealthy);
  } finally {
    await uploadLock.release();
  }
}

async function publishDraftWithLock(options: { cwd: string; id: string; credentials: AgentFeedCredentials; reviewBaseUrl?: string | null }, assertUploadLockHealthy: () => void): Promise<PublishDraftResult> {
  const draft = await readDraft(options.cwd, options.id);
  assertUploadLockHealthy();
  scanAndRedactDraftPublicFields(draft, { preserveResolvedFindings: true });
  const payloadHash = draftUploadPayloadHash(draft);
  if (draft.upload.uploaded && draft.upload.worklog_id && draft.upload.review_url) {
    let cached: PublishDraftResult;
    try {
      cached = parseCachedUploadResult(draft, options.credentials.api_base_url);
    } catch {
      draft.upload = { uploaded: false };
      assertUploadLockHealthy();
      await writeDraft(options.cwd, draft);
      throw new AgentFeedApiError(502, 'DRAFT_UPLOAD_METADATA_INVALID', 'Saved draft upload metadata is invalid. Run agentfeed share again to upload a fresh private review draft.');
    }
    try {
      assertCachedUploadPayloadCurrent(draft, payloadHash);
    } catch (error) {
      assertUploadLockHealthy();
      await writeDraft(options.cwd, draft);
      throw error;
    }
    if (cachedUploadCredentialBindingMatches(draft, options.credentials)) {
      assertUploadLockHealthy();
      await writeDraft(options.cwd, draft);
      return cached;
    }
  }
  let result: PublishDraftResult;
  try {
    result = await uploadDraft(draft, options.credentials, options.reviewBaseUrl);
  } catch (error) {
    if (error instanceof AgentFeedApiError) {
      const duplicate = duplicateIngestResult(error, draft.source.created_at, options.credentials.api_base_url, options.reviewBaseUrl);
      if (duplicate) result = duplicate;
      else throw error;
    } else {
      throw error;
    }
  }
  assertUploadLockHealthy();
  draft.upload = { uploaded: true, worklog_id: result.id, review_url: result.review_url, uploaded_at: result.created_at, payload_hash: payloadHash, ...uploadMetadataForCredentials(options.credentials, options.reviewBaseUrl) };
  assertUploadLockHealthy();
  await writeDraft(options.cwd, draft);
  return result;
}
