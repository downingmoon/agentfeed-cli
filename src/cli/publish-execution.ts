import { cachedUploadReuseStatusForCredentials, publishDraft as defaultPublishDraft, type ApiMetadata, type CachedUploadReuseFailureReason, type PublishDraftResult } from '../api/client.js';
import { loadCredentials as defaultLoadCredentials } from '../config/credentials.js';
import { readDraft as defaultReadDraft } from '../draft/read.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../types.js';
import { missingTokenMessage } from './auth-token-input.js';
import { handoffReviewUrl as defaultHandoffReviewUrl, shouldCopyReviewUrl, type ReviewUrlHandoffOptions } from './review-handoff.js';
import { shouldOpenReviewAfterUpload as defaultShouldOpenReviewAfterUpload, type ReviewOpenPolicyOptions } from './runtime-policy.js';
import { requireUploadPreflight as defaultRequireUploadPreflight } from './upload-preflight.js';

export type PublishCommandFlags = {
  readonly json: boolean;
  readonly yes: boolean;
  readonly clipboard: boolean;
  readonly noClipboard: boolean;
  readonly openReview: boolean;
  readonly noOpenReview: boolean;
};

type ReadDraft = (cwd: string, id: string) => Promise<LocalDraft>;
type LoadCredentials = () => Promise<AgentFeedCredentials | null>;
type RequireUploadPreflight = (credentials: AgentFeedCredentials, options: { readonly retryCommand?: string }) => Promise<ApiMetadata>;
type PublishDraft = (options: {
  readonly cwd: string;
  readonly id: string;
  readonly credentials: AgentFeedCredentials;
  readonly reviewBaseUrl?: string | null;
}) => Promise<PublishDraftResult>;
type ShouldOpenReviewAfterUpload = (openFlag: boolean, options: ReviewOpenPolicyOptions) => Promise<boolean>;
type HandoffReviewUrl = (reviewUrl: string, options: ReviewUrlHandoffOptions) => Promise<ReviewUrlHandoff>;

export type PublishCommandDependencies = {
  readonly readDraft?: ReadDraft;
  readonly loadCredentials?: LoadCredentials;
  readonly requireUploadPreflight?: RequireUploadPreflight;
  readonly publishDraft?: PublishDraft;
  readonly shouldOpenReviewAfterUpload?: ShouldOpenReviewAfterUpload;
  readonly handoffReviewUrl?: HandoffReviewUrl;
};

export type PublishCommandOptions = {
  readonly cwd: string;
  readonly id: string;
  readonly flags: PublishCommandFlags;
  readonly dependencies?: PublishCommandDependencies;
};

export type PublishConfirmationRequiredResult = {
  readonly kind: 'confirmation_required';
  readonly draft: LocalDraft;
  readonly command: string;
  readonly cacheReuseReason?: CachedUploadReuseFailureReason;
};

export type PublishCompleteResult = {
  readonly kind: 'published';
  readonly draft: LocalDraft;
  readonly upload: PublishDraftResult;
  readonly handoff: ReviewUrlHandoff;
};

export type PublishCommandResult = PublishConfirmationRequiredResult | PublishCompleteResult;

function uploadConfirmationResult(draft: LocalDraft, cacheReuseReason: CachedUploadReuseFailureReason): PublishConfirmationRequiredResult {
  const result = {
    kind: 'confirmation_required',
    draft,
    command: `agentfeed publish --id ${draft.id} --yes`
  } satisfies PublishConfirmationRequiredResult;
  if (!draft.upload.uploaded) return result;
  return { ...result, cacheReuseReason };
}

async function resolveReviewOpen(options: PublishCommandOptions): Promise<boolean> {
  const shouldOpenReviewAfterUpload = options.dependencies?.shouldOpenReviewAfterUpload ?? defaultShouldOpenReviewAfterUpload;
  if (options.flags.json) {
    return await shouldOpenReviewAfterUpload(options.flags.openReview, { respectConfig: false, noOpen: options.flags.noOpenReview });
  }
  return await shouldOpenReviewAfterUpload(options.flags.openReview, { noOpen: options.flags.noOpenReview });
}

function shouldCopyReviewAfterPublish(flags: PublishCommandFlags): boolean {
  if (flags.json) return shouldCopyReviewUrl({ json: true, noClipboard: flags.noClipboard, clipboard: flags.clipboard });
  return shouldCopyReviewUrl({ noClipboard: flags.noClipboard });
}

export async function runPublishCommand(options: PublishCommandOptions): Promise<PublishCommandResult> {
  const readDraft = options.dependencies?.readDraft ?? defaultReadDraft;
  const loadCredentials = options.dependencies?.loadCredentials ?? defaultLoadCredentials;
  const requireUploadPreflight = options.dependencies?.requireUploadPreflight ?? defaultRequireUploadPreflight;
  const publishDraft = options.dependencies?.publishDraft ?? defaultPublishDraft;
  const handoffReviewUrl = options.dependencies?.handoffReviewUrl ?? defaultHandoffReviewUrl;
  const existingDraft = await readDraft(options.cwd, options.id);
  const credentials = await loadCredentials();
  if (!credentials) throw new Error(missingTokenMessage());

  const cacheReuseStatus = cachedUploadReuseStatusForCredentials(existingDraft, credentials);
  if (!cacheReuseStatus.reusable && !options.flags.json && !options.flags.yes) {
    return uploadConfirmationResult(existingDraft, cacheReuseStatus.reason);
  }

  const metadata = await requireUploadPreflight(credentials, { retryCommand: `agentfeed publish --id ${options.id} --yes` });
  const upload = await publishDraft({
    cwd: options.cwd,
    id: options.id,
    credentials,
    reviewBaseUrl: metadata.review_base_url
  });
  const savedDraft = await readDraft(options.cwd, options.id);
  const handoff = await handoffReviewUrl(upload.review_url, {
    copy: shouldCopyReviewAfterPublish(options.flags),
    open: await resolveReviewOpen(options),
    apiBaseUrl: credentials.api_base_url,
    reviewBaseUrl: upload.review_base_url ?? metadata.review_base_url
  });
  return { kind: 'published', draft: savedDraft, upload, handoff };
}
