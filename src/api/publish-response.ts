import { AgentFeedApiError } from './errors.js';
import { hasOnlyExpectedFields } from './response-contract.js';
import { trustedReviewOrigin, validateReviewUrl } from './trusted-url.js';

export interface RemotePreviewPayload {
  readonly title: string;
  readonly summary: string;
  readonly user_note: string | null;
  readonly model: string | null;
  readonly metrics_row: string;
}

export interface RemotePreviewResult {
  readonly valid: boolean;
  readonly preview: RemotePreviewPayload;
  readonly warnings: readonly string[];
}

export type PublishDraftStatus = 'needs_review' | 'already_uploaded';
export type PublishDraftVisibility = 'private';

export interface PublishDraftResult {
  readonly id: string;
  readonly status: PublishDraftStatus;
  readonly visibility: PublishDraftVisibility;
  readonly review_url: string;
  readonly review_base_url?: string | null;
  readonly created_at: string;
  readonly reused_existing?: boolean;
}

export const CACHED_PRIVATE_REVIEW_UPLOAD_STATUS = 'already_uploaded' satisfies PublishDraftStatus;

const REMOTE_PRIVATE_REVIEW_UPLOAD_STATUS = 'needs_review' satisfies PublishDraftStatus;
const VALID_PRIVATE_REVIEW_VISIBILITY: PublishDraftVisibility = 'private';
const PUBLISH_DRAFT_RESULT_FIELDS = new Set(['id', 'status', 'visibility', 'review_url', 'created_at', 'reused_existing']);
const REMOTE_PREVIEW_RESULT_FIELDS = new Set(['valid', 'preview', 'warnings']);
const REMOTE_PREVIEW_PAYLOAD_FIELDS = new Set(['title', 'summary', 'user_note', 'model', 'metrics_row']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nullableStringField(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function remotePreviewContractError(): AgentFeedApiError {
  return new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API remote preview response contract mismatch. Local draft was kept.');
}

export function parseRemotePreviewResult(value: unknown): RemotePreviewResult {
  if (
    !isRecord(value)
    || !hasOnlyExpectedFields(value, REMOTE_PREVIEW_RESULT_FIELDS)
    || typeof value.valid !== 'boolean'
    || !isRecord(value.preview)
    || !hasOnlyExpectedFields(value.preview, REMOTE_PREVIEW_PAYLOAD_FIELDS)
    || !Array.isArray(value.warnings)
  ) {
    throw remotePreviewContractError();
  }

  const title = stringField(value.preview.title);
  const summary = stringField(value.preview.summary);
  const userNote = nullableStringField(value.preview.user_note);
  const model = nullableStringField(value.preview.model);
  const metricsRow = stringField(value.preview.metrics_row);
  const warnings = value.warnings.every(item => typeof item === 'string') ? value.warnings : null;

  if (!title || !summary || userNote === undefined || model === undefined || !metricsRow || !warnings) {
    throw remotePreviewContractError();
  }

  return {
    valid: value.valid,
    preview: { title, summary, user_note: userNote, model, metrics_row: metricsRow },
    warnings
  };
}

function isPublishDraftStatus(value: string, options: { readonly allowCachedStatus?: boolean } = {}): value is PublishDraftStatus {
  return value === REMOTE_PRIVATE_REVIEW_UPLOAD_STATUS || (options.allowCachedStatus === true && value === CACHED_PRIVATE_REVIEW_UPLOAD_STATUS);
}

export function worklogIdFromReviewUrl(reviewUrl: string): string | null {
  try {
    const parts = new URL(reviewUrl).pathname.split('/').filter(Boolean);
    const worklogsIndex = parts.indexOf('worklogs');
    const encodedId = worklogsIndex >= 0 ? parts[worklogsIndex + 1] : null;
    return encodedId ? decodeURIComponent(encodedId) : null;
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}

export function parsePublishDraftResult(value: unknown, apiBaseUrl: string, reviewBaseUrl?: string | null, options: { readonly allowCachedStatus?: boolean } = {}): PublishDraftResult {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, PUBLISH_DRAFT_RESULT_FIELDS)) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid upload response. Local draft was kept.');
  }
  const id = stringField(value.id);
  const status = stringField(value.status);
  const visibility = stringField(value.visibility);
  const reviewUrl = stringField(value.review_url);
  const createdAt = stringField(value.created_at);
  if (
    !id
    || !status
    || !isPublishDraftStatus(status, options)
    || visibility !== VALID_PRIVATE_REVIEW_VISIBILITY
    || !reviewUrl
    || !createdAt
    || !Number.isFinite(Date.parse(createdAt))
    || !validateReviewUrl(reviewUrl, apiBaseUrl, reviewBaseUrl)
    || worklogIdFromReviewUrl(reviewUrl) !== id
  ) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid upload response. Local draft was kept.');
  }
  return {
    id,
    status,
    visibility,
    review_url: reviewUrl,
    review_base_url: trustedReviewOrigin(reviewBaseUrl),
    created_at: createdAt,
    reused_existing: value.reused_existing === true ? true : undefined
  };
}
