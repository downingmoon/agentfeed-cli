import type { AgentFeedCredentials, CliAuthExchangeResult, CliAuthSession, LocalDraft } from '../types.js';
export type { ApiMetadata } from './metadata.js';
import { readDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import { AgentFeedApiError } from './errors.js';
import { draftToIngestRequest } from './ingest-request.js';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from './draft-upload-hash.js';
export { draftUploadCredentialBindingHash, draftUploadPayloadHash } from './draft-upload-hash.js';
import { apiErrorResponseSummary, parseApiErrorEnvelope, readResponseJson, responseDataEnvelope } from './response-contract.js';
import { parsePublishDraftResult, parseRemotePreviewResult, type PublishDraftResult, type RemotePreviewResult } from './publish-response.js';
export type { PublishDraftResult, PublishDraftStatus, PublishDraftVisibility, RemotePreviewPayload, RemotePreviewResult } from './publish-response.js';
import { parseCliAuthExchangeResult, parseCliAuthSession } from './cli-auth-response.js';
import { acquireDraftUploadLock } from './draft-upload-lock.js';
import { validateReviewUrl } from './trusted-url.js';
import { apiUrl, fetchWithTimeout, withTransientRetry } from './transport.js';
import { assertCachedUploadPayloadCurrent, cachedUploadCredentialBindingMatches, duplicateIngestResult, parseCachedUploadResult, uploadMetadataForCredentials } from './cached-upload.js';
export { cachedUploadReusableForCredentials, cachedUploadReuseStatusForCredentials } from './cached-upload.js';
export type { CachedUploadReuseFailureReason, CachedUploadReuseStatus } from './cached-upload.js';

export { AgentFeedApiError } from './errors.js';
export type { IngestionTokenStatus } from './ingestion-token-status.js';
export { apiMetadataCompatible, checkApiCompatibility, checkApiReachability, checkIngestionToken, EXPECTED_API_CONTRACT_VERSION, EXPECTED_API_VERSION } from './api-checks.js';
export type { ApiCheckResult, ApiCompatibilityCheckResult } from './api-checks.js';

export { draftToIngestRequest } from './ingest-request.js';

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

async function postJson(apiBaseUrl: string, path: string, body: Record<string, unknown>): Promise<unknown> {
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
  return responseDataEnvelope(data, {
    successMessage: 'AgentFeed API response is missing the data envelope.',
    unexpectedFieldsMessage: 'AgentFeed API response has unexpected data envelope fields.'
  });
}

export async function createCliAuthSession(apiBaseUrl: string, input: { verifier: string; deviceName?: string; replaceTokenId?: string }): Promise<CliAuthSession> {
  const data = await postJson(apiBaseUrl, '/auth/cli/sessions', {
    verifier: input.verifier,
    device_name: input.deviceName,
    replace_token_id: input.replaceTokenId
  });
  return parseCliAuthSession(data, apiBaseUrl);
}

export async function exchangeCliAuthSession(apiBaseUrl: string, sessionId: string, verifier: string): Promise<CliAuthExchangeResult> {
  return parseCliAuthExchangeResult(await postJson(apiBaseUrl, `/auth/cli/sessions/${encodeURIComponent(sessionId)}/exchange`, { verifier }));
}

async function postIngest(path: string, draft: LocalDraft, credentials: AgentFeedCredentials): Promise<unknown> {
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
    return responseDataEnvelope(data, {
      successMessage: 'AgentFeed API upload response is missing the data envelope.',
      unexpectedFieldsMessage: 'AgentFeed API upload response has unexpected data envelope fields.',
      localDraftKept: true
    });
  });
}


export async function previewDraftRemote(draft: LocalDraft, credentials: AgentFeedCredentials): Promise<RemotePreviewResult> {
  return parseRemotePreviewResult(await postIngest('/ingest/worklogs/preview', draft, credentials));
}

export async function uploadDraft(draft: LocalDraft, credentials: AgentFeedCredentials, reviewBaseUrl?: string | null): Promise<PublishDraftResult> {
  return parsePublishDraftResult(await postIngest('/ingest/worklogs', draft, credentials), credentials.api_base_url, reviewBaseUrl);
}

export function isTrustedReviewUrl(reviewUrl: string, apiBaseUrl: string, reviewBaseUrl?: string | null): boolean {
  return validateReviewUrl(reviewUrl, apiBaseUrl, reviewBaseUrl);
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
