import type { AgentFeedCredentials, CliAuthExchangeResult, CliAuthSession, IngestWorklogRequest, LocalDraft, Visibility, WorklogStatus } from '../types.js';
import { readDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { sanitizedDraftForUpload, scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import { stripUrlUserInfo } from '../privacy/url.js';
import { shortHash } from '../utils/hash.js';

export class AgentFeedApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
}

export interface ApiCheckResult {
  ok: boolean;
  url: string;
  status?: number;
  error?: string;
  data?: IngestionTokenStatus;
}

const DEFAULT_API_REQUEST_TIMEOUT_MS = 30_000;
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

export interface IngestionTokenStatus {
  ok?: boolean;
  user?: { id?: string; username?: string | null; display_name?: string | null };
  token?: {
    id?: string;
    name?: string;
    created_at?: string;
    last_used_at?: string | null;
    expires_at?: string;
    expires_in_seconds?: number;
    expiring_soon?: boolean;
  };
}

async function parseCheckData(response: Response): Promise<IngestionTokenStatus | undefined> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    const parsed = await response.json() as { data?: IngestionTokenStatus };
    return parsed.data;
  } catch {
    return undefined;
  }
}

async function fetchCheck(url: string, init: RequestInit): Promise<ApiCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: response.ok, url, status: response.status, data: await parseCheckData(response) };
  } catch (error) {
    return { ok: false, url, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkApiReachability(apiBaseUrl: string): Promise<ApiCheckResult> {
  return fetchCheck(healthUrl(apiBaseUrl), { method: 'GET' });
}

export async function checkIngestionToken(credentials: AgentFeedCredentials): Promise<ApiCheckResult> {
  return fetchCheck(apiUrl(credentials.api_base_url, '/ingest/status'), {
    method: 'GET',
    headers: { authorization: `Bearer ${credentials.ingestion_token}` }
  });
}

export function draftToIngestRequest(draft: LocalDraft): IngestWorklogRequest {
  const safeDraft = sanitizedDraftForUpload(draft);
  const source: IngestWorklogRequest['source'] = {
    agent: safeDraft.source.agent,
    tool_version: safeDraft.source.tool_version,
    local_draft_id: `draft_${shortHash(`draft:${safeDraft.id}`, 16)}`,
    collection_window: safeDraft.source.collection_window ?? null,
    collection_window_reason: safeDraft.source.collection_window_reason ?? null,
    collection_fingerprint: safeDraft.source.collection_fingerprint ?? null
  };
  if (safeDraft.source.session_id) source.session_id = `session_${shortHash(`session:${safeDraft.source.session_id}`, 16)}`;
  return {
    source,
    project: {
      name: safeDraft.project.name,
      repository_url: stripUrlUserInfo(safeDraft.project.repository_url),
      local_path_hash: safeDraft.project.local_path_hash
    },
    worklog: {
      title: safeDraft.worklog.title,
      summary: safeDraft.worklog.summary,
      user_note: safeDraft.worklog.user_note ?? null,
      model: safeDraft.worklog.model ?? null,
      category: safeDraft.worklog.category,
      tags: safeDraft.worklog.tags,
      metrics: safeDraft.worklog.metrics,
      changed_areas: safeDraft.worklog.changed_areas,
      public_prompt: safeDraft.worklog.public_prompt ?? null,
      outcome: safeDraft.worklog.outcome,
      timeline: safeDraft.worklog.timeline
    },
    privacy_scan: safeDraft.privacy_scan
  };
}

export function draftUploadPayloadHash(draft: LocalDraft): string {
  return shortHash(JSON.stringify(draftToIngestRequest(draft)), 32);
}

function friendlyError(status: number, code: string, message: string, details?: Record<string, unknown>): string {
  if (status === 401 || code === 'INGESTION_TOKEN_INVALID') {
    return 'Login/token problem. Run: agentfeed rotate. If AGENTFEED_TOKEN is set, replace that environment variable or run: agentfeed rotate --browser.';
  }
  if (status === 413 || code === 'INGESTION_PAYLOAD_TOO_LARGE') return 'Draft payload is too large. Local draft was kept.';
  if (status === 422 || code === 'VALIDATION_ERROR') return `Validation error: ${message}${details ? ` ${JSON.stringify(details)}` : ''}`;
  if (status === 429 || code === 'RATE_LIMITED') return `Rate limited.${details?.retry_after_seconds ? ` Retry after ${details.retry_after_seconds} seconds.` : ''}`;
  if (status === 409 || code === 'DUPLICATE_INGESTION_SESSION') return `Duplicate ingestion session.${details?.review_url ? ` Existing review URL: ${details.review_url}` : ''}`;
  if (status >= 500) return 'Server error. Local draft was kept.';
  return message || `AgentFeed API error (${status})`;
}

function networkErrorMessage(error: unknown, options: { localDraftKept?: boolean } = {}): string {
  const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
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
    throw new AgentFeedApiError(0, 'API_REQUEST_FAILED', networkErrorMessage(error, options));
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

export interface RemotePreviewResult {
  valid: boolean;
  preview: Record<string, unknown>;
  warnings: string[];
}

export interface PublishDraftResult {
  id: string;
  status: WorklogStatus | 'already_uploaded';
  visibility: Visibility;
  review_url: string;
  created_at: string;
  reused_existing?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function optionalStringField(value: unknown): string | null | undefined {
  if (value == null) return value as null | undefined;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function validOptionalDateString(value: unknown): string | null | undefined {
  const text = optionalStringField(value);
  if (text === undefined || text === null) return text;
  return Number.isFinite(Date.parse(text)) ? text : undefined;
}

function parseOptionalUser(value: unknown): AgentFeedCredentials['user'] | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const id = Object.hasOwn(value, 'id') ? optionalStringField(value.id) : undefined;
  const username = Object.hasOwn(value, 'username') ? optionalStringField(value.username) : undefined;
  const displayName = Object.hasOwn(value, 'display_name') ? optionalStringField(value.display_name) : undefined;
  if (id === undefined && Object.hasOwn(value, 'id')) return null;
  if (username === undefined && Object.hasOwn(value, 'username')) return null;
  if (displayName === undefined && Object.hasOwn(value, 'display_name')) return null;
  const user: NonNullable<AgentFeedCredentials['user']> = {};
  if (id !== undefined && id !== null) user.id = id;
  if (username !== undefined && username !== null) user.username = username;
  if (displayName !== undefined && displayName !== null) user.display_name = displayName;
  return user;
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0' || host.startsWith('127.');
}

function isAgentFeedHostname(hostname: string): boolean {
  return hostname === 'agentfeed.dev' || hostname.endsWith('.agentfeed.dev');
}

function isAgentFeedReviewHostname(hostname: string): boolean {
  return isAgentFeedHostname(hostname) && !hostname.startsWith('api.');
}

function isExpectedReviewPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '');
  return /^\/(?:review\/[^/]+|worklogs\/[^/]+\/review)$/.test(normalized);
}

function validateReviewUrl(reviewUrl: string, apiBaseUrl: string): boolean {
  try {
    const review = new URL(reviewUrl);
    const api = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(review.protocol)) return false;
    if (review.username || review.password) return false;
    if (review.search || review.hash) return false;
    if (!isExpectedReviewPath(review.pathname)) return false;
    if (isLocalHostname(api.hostname)) return isLocalHostname(review.hostname);
    if (review.protocol !== 'https:') return false;
    if (isAgentFeedHostname(api.hostname)) return isAgentFeedReviewHostname(review.hostname);
    return review.hostname === api.hostname;
  } catch {
    return false;
  }
}

function isExpectedAuthorizePath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === '/cli/authorize';
}

function hasOnlyExpectedAuthorizeQuery(url: URL, sessionId: string): boolean {
  const entries = Array.from(url.searchParams.entries());
  return entries.length === 1 && entries[0]?.[0] === 'session_id' && entries[0][1] === sessionId;
}

function validateAuthorizeUrl(authorizeUrl: string, apiBaseUrl: string, sessionId: string): boolean {
  try {
    const authorize = new URL(authorizeUrl);
    const api = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(authorize.protocol)) return false;
    if (authorize.username || authorize.password || authorize.hash) return false;
    if (!isExpectedAuthorizePath(authorize.pathname)) return false;
    if (!hasOnlyExpectedAuthorizeQuery(authorize, sessionId)) return false;
    if (isLocalHostname(api.hostname)) {
      return isLocalHostname(authorize.hostname);
    }
    if (authorize.protocol !== 'https:') return false;
    if (isAgentFeedHostname(api.hostname)) {
      return isAgentFeedReviewHostname(authorize.hostname);
    }
    return authorize.hostname === api.hostname;
  } catch {
    return false;
  }
}

function parseCliAuthSession(value: unknown, apiBaseUrl: string): CliAuthSession {
  if (!isRecord(value)) throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth session.');
  const sessionId = stringField(value.session_id);
  const authorizeUrl = stringField(value.authorize_url);
  const expiresAt = stringField(value.expires_at);
  const pollIntervalSeconds = Number(value.poll_interval_seconds);
  if (
    !sessionId
    || !authorizeUrl
    || !expiresAt
    || !Number.isFinite(Date.parse(expiresAt))
    || !Number.isFinite(pollIntervalSeconds)
    || pollIntervalSeconds < 1
    || pollIntervalSeconds > 60
    || !validateAuthorizeUrl(authorizeUrl, apiBaseUrl, sessionId)
  ) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth session.');
  }
  return {
    session_id: sessionId,
    authorize_url: authorizeUrl,
    expires_at: expiresAt,
    poll_interval_seconds: pollIntervalSeconds
  };
}

const VALID_PRIVATE_REVIEW_UPLOAD_STATUSES = new Set<string>([
  'draft',
  'needs_review',
  'private',
  'already_uploaded'
]);

const VALID_PRIVATE_REVIEW_VISIBILITY = 'private';

function parsePublishDraftResult(value: unknown, apiBaseUrl: string): PublishDraftResult {
  if (!isRecord(value)) throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid upload response.');
  const id = stringField(value.id);
  const status = stringField(value.status);
  const visibility = stringField(value.visibility);
  const reviewUrl = stringField(value.review_url);
  const createdAt = stringField(value.created_at);
  if (
    !id
    || !status
    || !VALID_PRIVATE_REVIEW_UPLOAD_STATUSES.has(status)
    || visibility !== VALID_PRIVATE_REVIEW_VISIBILITY
    || !reviewUrl
    || !createdAt
    || !Number.isFinite(Date.parse(createdAt))
    || !validateReviewUrl(reviewUrl, apiBaseUrl)
  ) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid upload response. Local draft was kept.');
  }
  return {
    id,
    status: status as PublishDraftResult['status'],
    visibility: visibility as PublishDraftResult['visibility'],
    review_url: reviewUrl,
    created_at: createdAt,
    reused_existing: value.reused_existing === true ? true : undefined
  };
}

function parseCliAuthExchangeResult(value: unknown): CliAuthExchangeResult {
  if (!isRecord(value)) throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth exchange response.');
  const token = stringField(value.token);
  const tokenId = optionalStringField(value.token_id);
  const hasTokenExpiresAt = Object.hasOwn(value, 'token_expires_at');
  const tokenExpiresAt = hasTokenExpiresAt ? validOptionalDateString(value.token_expires_at) : undefined;
  const rotatedFrom = optionalStringField(value.rotated_from);
  const rotatedAt = optionalStringField(value.rotated_at);
  const user = parseOptionalUser(value.user);
  if (
    !token
    || (Object.hasOwn(value, 'token_id') && tokenId === undefined)
    || (hasTokenExpiresAt && tokenExpiresAt === undefined)
    || (Object.hasOwn(value, 'rotated_from') && rotatedFrom === undefined)
    || (Object.hasOwn(value, 'rotated_at') && (rotatedAt === undefined || (rotatedAt !== null && !Number.isFinite(Date.parse(rotatedAt)))))
    || user === null
  ) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth exchange response.');
  }
  return {
    token,
    token_id: tokenId ?? undefined,
    token_expires_at: tokenExpiresAt,
    rotated_from: rotatedFrom ?? undefined,
    rotated_at: rotatedAt ?? undefined,
    user
  };
}

async function postJson<T>(apiBaseUrl: string, path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithTimeout(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const api = data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
    const code = api.error?.code ?? `HTTP_${response.status}`;
    const msg = friendlyError(response.status, code, api.error?.message ?? response.statusText, api.error?.details);
    throw new AgentFeedApiError(response.status, code, msg, api.error?.details);
  }
  return (data as { data: T }).data;
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
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const api = data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
      const retryAfterHeader = Number(response.headers.get('retry-after'));
      const details = Number.isFinite(retryAfterHeader) && retryAfterHeader >= 0 && api.error?.details?.retry_after_seconds == null
        ? { ...(api.error?.details ?? {}), retry_after_seconds: retryAfterHeader }
        : api.error?.details;
      const code = api.error?.code ?? `HTTP_${response.status}`;
      const msg = friendlyError(response.status, code, api.error?.message ?? response.statusText, details);
      throw new AgentFeedApiError(response.status, code, msg, details);
    }
    return (data as { data: T }).data;
  });
}


export async function previewDraftRemote(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<RemotePreviewResult> {
  return postIngest<RemotePreviewResult>('/ingest/worklogs/preview', draft, credentials);
}

export async function uploadDraft(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<PublishDraftResult> {
  return parsePublishDraftResult(await postIngest<unknown>('/ingest/worklogs', draft, credentials), credentials.api_base_url);
}

export function isTrustedReviewUrl(reviewUrl: string, apiBaseUrl: string): boolean {
  return validateReviewUrl(reviewUrl, apiBaseUrl);
}

function parseCachedUploadResult(draft: LocalDraft, apiBaseUrl: string): PublishDraftResult {
  return parsePublishDraftResult({
    id: draft.upload.worklog_id,
    status: 'already_uploaded',
    visibility: 'private',
    review_url: draft.upload.review_url,
    created_at: draft.upload.uploaded_at ?? draft.source.created_at,
    reused_existing: true
  }, apiBaseUrl);
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

function detailString(details: Record<string, unknown> | undefined, key: string): string | null {
  const value = details?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function worklogIdFromReviewUrl(reviewUrl: string): string | null {
  try {
    const parts = new URL(reviewUrl).pathname.split('/').filter(Boolean);
    const worklogsIndex = parts.indexOf('worklogs');
    return worklogsIndex >= 0 ? parts[worklogsIndex + 1] ?? null : null;
  } catch {
    return null;
  }
}

function duplicateIngestResult(error: AgentFeedApiError, fallbackCreatedAt: string, apiBaseUrl: string): PublishDraftResult | null {
  if (error.status !== 409 || error.code !== 'DUPLICATE_INGESTION_SESSION') return null;
  const reviewUrl = detailString(error.details, 'review_url');
  if (!reviewUrl) return null;
  const worklogId = detailString(error.details, 'worklog_id')
    ?? detailString(error.details, 'id')
    ?? worklogIdFromReviewUrl(reviewUrl);
  if (!worklogId) return null;
  const result = {
    id: worklogId,
    status: 'already_uploaded',
    visibility: 'private',
    review_url: reviewUrl,
    created_at: detailString(error.details, 'created_at') ?? fallbackCreatedAt,
    reused_existing: true
  };
  try {
    return parsePublishDraftResult(result, apiBaseUrl);
  } catch {
    return null;
  }
}

export async function publishDraft(options: { cwd: string; id: string; credentials: AgentFeedCredentials }): Promise<PublishDraftResult> {
  const draft = await readDraft(options.cwd, options.id);
  scanAndRedactDraftPublicFields(draft);
  const payloadHash = draftUploadPayloadHash(draft);
  if (draft.upload.uploaded && draft.upload.worklog_id && draft.upload.review_url) {
    let cached: PublishDraftResult;
    try {
      cached = parseCachedUploadResult(draft, options.credentials.api_base_url);
    } catch {
      draft.upload = { uploaded: false };
      await writeDraft(options.cwd, draft);
      throw new AgentFeedApiError(502, 'DRAFT_UPLOAD_METADATA_INVALID', 'Saved draft upload metadata is invalid. Run agentfeed share again to upload a fresh private review draft.');
    }
    try {
      assertCachedUploadPayloadCurrent(draft, payloadHash);
    } catch (error) {
      await writeDraft(options.cwd, draft);
      throw error;
    }
    await writeDraft(options.cwd, draft);
    return cached;
  }
  let result: PublishDraftResult;
  try {
    result = await uploadDraft(draft, options.credentials);
  } catch (error) {
    if (error instanceof AgentFeedApiError) {
      const duplicate = duplicateIngestResult(error, draft.source.created_at, options.credentials.api_base_url);
      if (duplicate) result = duplicate;
      else throw error;
    } else {
      throw error;
    }
  }
  draft.upload = { uploaded: true, worklog_id: result.id, review_url: result.review_url, uploaded_at: result.created_at, payload_hash: payloadHash };
  await writeDraft(options.cwd, draft);
  return result;
}
