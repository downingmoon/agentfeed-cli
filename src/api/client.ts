import type { AgentFeedCredentials, CliAuthExchangeResult, CliAuthSession, IngestWorklogRequest, LocalDraft, WorklogStatus } from '../types.js';
import { readDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';

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

async function fetchCheck(url: string, init: RequestInit): Promise<ApiCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: response.ok, url, status: response.status };
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
  return {
    source: {
      agent: draft.source.agent,
      tool_version: draft.source.tool_version,
      host_label: draft.source.host_label,
      session_id: draft.source.session_id,
      local_draft_id: draft.id,
      collection_window: draft.source.collection_window ?? null,
      collection_window_reason: draft.source.collection_window_reason ?? null,
      collection_fingerprint: draft.source.collection_fingerprint ?? null
    },
    project: {
      name: draft.project.name,
      repository_url: draft.project.repository_url ?? null,
      local_path_hash: draft.project.local_path_hash
    },
    worklog: {
      title: draft.worklog.title,
      summary: draft.worklog.summary,
      user_note: draft.worklog.user_note ?? null,
      category: draft.worklog.category,
      tags: draft.worklog.tags,
      metrics: draft.worklog.metrics,
      changed_areas: draft.worklog.changed_areas,
      public_prompt: draft.worklog.public_prompt ?? null,
      outcome: draft.worklog.outcome,
      timeline: draft.worklog.timeline
    },
    privacy_scan: draft.privacy_scan
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

async function postJson<T>(apiBaseUrl: string, path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
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
  const response = await fetch(apiUrl(credentials.api_base_url, path), {
    method: 'POST',
    headers: { authorization: `Bearer ${credentials.ingestion_token}`, 'content-type': 'application/json' },
    body
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

export async function previewDraftRemote(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<RemotePreviewResult> {
  return postIngest<RemotePreviewResult>('/ingest/worklogs/preview', draft, credentials);
}

export async function uploadDraft(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<PublishDraftResult> {
  return postIngest<PublishDraftResult>('/ingest/worklogs', draft, credentials);
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
  const result = await uploadDraft(draft, options.credentials);
  draft.upload = { uploaded: true, worklog_id: result.id, review_url: result.review_url, uploaded_at: result.created_at };
  await writeDraft(options.cwd, draft);
  return result;
}
