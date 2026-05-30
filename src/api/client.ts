import type { AgentFeedCredentials, CliAuthExchangeResult, CliAuthSession, IngestWorklogRequest, LocalDraft, RotatedIngestionTokenResult, WorklogStatus } from '../types.js';
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

function apiRequestTimeoutMs(): number {
  const configured = Number(process.env.AGENTFEED_API_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_API_REQUEST_TIMEOUT_MS;
}

function apiUrl(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`;
}

function healthUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  url.pathname = '/health';
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

function friendlyError(status: number, code: string, message: string, details?: Record<string, unknown>): string {
  if (status === 401 || code === 'INGESTION_TOKEN_INVALID') return 'Login/token problem. Run: agentfeed login';
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
        options.localDraftKept ? 'AgentFeed API request timed out. Local draft was kept.' : 'AgentFeed API request timed out.'
      );
    }
    throw new AgentFeedApiError(0, 'API_REQUEST_FAILED', networkErrorMessage(error, options));
  } finally {
    clearTimeout(timer);
  }
}

export interface RemotePreviewResult {
  valid: boolean;
  preview: Record<string, unknown>;
  warnings: string[];
}

export interface PublishDraftResult {
  id: string;
  status: WorklogStatus | 'already_uploaded';
  visibility: 'private';
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

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost');
}

function isAgentFeedHostname(hostname: string): boolean {
  return hostname === 'agentfeed.dev' || hostname.endsWith('.agentfeed.dev');
}

function validateReviewUrl(reviewUrl: string, apiBaseUrl: string): boolean {
  try {
    const review = new URL(reviewUrl);
    const api = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(review.protocol)) return false;
    if (review.username || review.password) return false;
    if (isLocalHostname(api.hostname)) return isLocalHostname(review.hostname);
    if (review.protocol !== 'https:') return false;
    if (api.hostname === 'api.agentfeed.dev') return isAgentFeedHostname(review.hostname);
    return true;
  } catch {
    return false;
  }
}

const VALID_UPLOAD_STATUSES = new Set<string>([
  'draft',
  'needs_review',
  'private',
  'unlisted',
  'public',
  'rejected',
  'deleted',
  'already_uploaded'
]);

function parsePublishDraftResult(value: unknown, apiBaseUrl: string): PublishDraftResult {
  if (!isRecord(value)) throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid upload response.');
  const id = stringField(value.id);
  const status = stringField(value.status);
  const visibility = stringField(value.visibility);
  const reviewUrl = stringField(value.review_url);
  const createdAt = stringField(value.created_at);
  if (!id || !status || !VALID_UPLOAD_STATUSES.has(status) || visibility !== 'private' || !reviewUrl || !createdAt || !Number.isFinite(Date.parse(createdAt)) || !validateReviewUrl(reviewUrl, apiBaseUrl)) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid upload response. Local draft was kept.');
  }
  return {
    id,
    status: status as PublishDraftResult['status'],
    visibility: 'private',
    review_url: reviewUrl,
    created_at: createdAt,
    reused_existing: value.reused_existing === true ? true : undefined
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

export async function createCliAuthSession(apiBaseUrl: string, input: { verifier: string; deviceName?: string }): Promise<CliAuthSession> {
  return postJson<CliAuthSession>(apiBaseUrl, '/auth/cli/sessions', {
    verifier: input.verifier,
    device_name: input.deviceName
  });
}

export async function exchangeCliAuthSession(apiBaseUrl: string, sessionId: string, verifier: string): Promise<CliAuthExchangeResult> {
  return postJson<CliAuthExchangeResult>(apiBaseUrl, `/auth/cli/sessions/${encodeURIComponent(sessionId)}/exchange`, { verifier });
}

async function postIngest<T>(path: string, draft: LocalDraft, credentials: AgentFeedCredentials): Promise<T> {
  const payload = draftToIngestRequest(draft);
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body, 'utf8') > 512 * 1024) throw new AgentFeedApiError(413, 'INGESTION_PAYLOAD_TOO_LARGE', 'Draft payload is too large.');
  const response = await fetchWithTimeout(apiUrl(credentials.api_base_url, path), {
    method: 'POST',
    headers: { authorization: `Bearer ${credentials.ingestion_token}`, 'content-type': 'application/json' },
    body
  }, { localDraftKept: true });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const api = data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
    const code = api.error?.code ?? `HTTP_${response.status}`;
    const msg = friendlyError(response.status, code, api.error?.message ?? response.statusText, api.error?.details);
    throw new AgentFeedApiError(response.status, code, msg, api.error?.details);
  }
  return (data as { data: T }).data;
}


export async function rotateIngestionToken(credentials: AgentFeedCredentials): Promise<RotatedIngestionTokenResult> {
  const response = await fetchWithTimeout(apiUrl(credentials.api_base_url, '/ingest/token/rotate'), {
    method: 'POST',
    headers: { authorization: `Bearer ${credentials.ingestion_token}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const api = data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
    const code = api.error?.code ?? `HTTP_${response.status}`;
    const msg = friendlyError(response.status, code, api.error?.message ?? response.statusText, api.error?.details);
    throw new AgentFeedApiError(response.status, code, msg, api.error?.details);
  }
  return (data as { data: RotatedIngestionTokenResult }).data;
}

export async function previewDraftRemote(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<RemotePreviewResult> {
  return postIngest<RemotePreviewResult>('/ingest/worklogs/preview', draft, credentials);
}

export async function uploadDraft(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<PublishDraftResult> {
  return parsePublishDraftResult(await postIngest<unknown>('/ingest/worklogs', draft, credentials), credentials.api_base_url);
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
  if (draft.upload.uploaded && draft.upload.worklog_id && draft.upload.review_url) {
    return {
      id: draft.upload.worklog_id,
      status: 'already_uploaded',
      visibility: 'private',
      review_url: draft.upload.review_url,
      created_at: draft.upload.uploaded_at ?? draft.source.created_at,
      reused_existing: true
    };
  }
  scanAndRedactDraftPublicFields(draft);
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
  draft.upload = { uploaded: true, worklog_id: result.id, review_url: result.review_url, uploaded_at: result.created_at };
  await writeDraft(options.cwd, draft);
  return result;
}
