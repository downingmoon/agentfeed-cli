import type { AgentFeedCredentials, LocalDraft } from '../types.js';
import { scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import { AgentFeedApiError } from './errors.js';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from './draft-upload-hash.js';
import { CACHED_PRIVATE_REVIEW_UPLOAD_STATUS, parsePublishDraftResult, worklogIdFromReviewUrl, type PublishDraftResult } from './publish-response.js';
import { trustedReviewOrigin } from './trusted-url.js';

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
  | { readonly reusable: true }
  | { readonly reusable: false; readonly reason: CachedUploadReuseFailureReason; readonly canRetry: true };

function detailString(details: Record<string, unknown> | undefined, key: string): string | null {
  const value = details?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseCachedUploadResult(draft: LocalDraft, apiBaseUrl: string): PublishDraftResult {
  return parsePublishDraftResult({
    id: draft.upload.worklog_id,
    status: CACHED_PRIVATE_REVIEW_UPLOAD_STATUS,
    visibility: 'private',
    review_url: draft.upload.review_url,
    created_at: draft.upload.uploaded_at ?? draft.source.created_at,
    reused_existing: true
  }, apiBaseUrl, draft.upload.review_base_url, { allowCachedStatus: true });
}

export function cachedUploadReuseStatusForCredentials(draft: LocalDraft, credentials: AgentFeedCredentials): CachedUploadReuseStatus {
  if (!draft.upload.uploaded) return { reusable: false, reason: 'missing_upload_marker', canRetry: true };
  if (!draft.upload.worklog_id) return { reusable: false, reason: 'missing_worklog_id', canRetry: true };
  if (!draft.upload.review_url) return { reusable: false, reason: 'missing_review_url', canRetry: true };
  if (!draft.upload.payload_hash) return { reusable: false, reason: 'missing_payload_hash', canRetry: true };
  if (!draft.upload.credential_binding_hash) return { reusable: false, reason: 'missing_credential_binding', canRetry: true };
  if (draft.upload.api_base_url && draft.upload.api_base_url !== credentials.api_base_url) return { reusable: false, reason: 'base_url_mismatch', canRetry: true };

  const safeDraft = structuredClone(draft);
  scanAndRedactDraftPublicFields(safeDraft, { preserveResolvedFindings: true });
  try {
    parseCachedUploadResult(safeDraft, credentials.api_base_url);
  } catch (error) {
    if (error instanceof Error) return { reusable: false, reason: 'invalid_review_url', canRetry: true };
    throw error;
  }
  if (safeDraft.upload.payload_hash !== draftUploadPayloadHash(safeDraft)) return { reusable: false, reason: 'payload_hash_mismatch', canRetry: true };
  if (safeDraft.upload.credential_binding_hash !== draftUploadCredentialBindingHash(credentials)) return { reusable: false, reason: 'credential_binding_mismatch', canRetry: true };
  return { reusable: true };
}

export function cachedUploadReusableForCredentials(draft: LocalDraft, credentials: AgentFeedCredentials): boolean {
  return cachedUploadReuseStatusForCredentials(draft, credentials).reusable;
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

export function assertCachedUploadPayloadCurrent(draft: LocalDraft, currentPayloadHash: string): void {
  if (draft.upload.payload_hash === currentPayloadHash) return;
  throw staleCachedUploadError(draft);
}

export function cachedUploadCredentialBindingMatches(draft: LocalDraft, credentials: AgentFeedCredentials): boolean {
  return draft.upload.credential_binding_hash === draftUploadCredentialBindingHash(credentials);
}

export function uploadMetadataForCredentials(credentials: AgentFeedCredentials, reviewBaseUrl?: string | null): Pick<LocalDraft['upload'], 'api_base_url' | 'review_base_url' | 'credential_binding_hash' | 'token_id' | 'user_id'> {
  return {
    api_base_url: credentials.api_base_url,
    review_base_url: trustedReviewOrigin(reviewBaseUrl),
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null
  };
}

export function duplicateIngestResult(error: AgentFeedApiError, fallbackCreatedAt: string, apiBaseUrl: string, reviewBaseUrl?: string | null): PublishDraftResult | null {
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
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}
