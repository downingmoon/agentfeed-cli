import { publishDraft as defaultPublishDraft, type ApiMetadata, type PublishDraftResult } from '../api/client.js';
import { markCollectionComplete as defaultMarkCollectionComplete } from '../config/collection-state.js';
import { readDraft as defaultReadDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import type { AgentFeedCredentials, CollectionWindow, LocalDraft, ReviewUrlHandoff } from '../types.js';
import { handoffReviewUrl as defaultHandoffReviewUrl, shouldCopyReviewUrl, type ReviewUrlHandoffOptions } from './review-handoff.js';
import { shouldOpenReviewAfterUpload as defaultShouldOpenReviewAfterUpload, shouldRequireUploadConfirmation, type ReviewOpenPolicyOptions } from './runtime-policy.js';
import { requireUploadPreflight as defaultRequireUploadPreflight } from './upload-preflight.js';

export type ShareUploadFlags = {
  readonly json: boolean;
  readonly yes: boolean;
  readonly clipboard: boolean;
  readonly noClipboard: boolean;
  readonly openReview: boolean;
  readonly noOpenReview: boolean;
  readonly noSaveCursor: boolean;
};

type RequireUploadPreflight = (credentials: AgentFeedCredentials) => Promise<ApiMetadata>;
type PublishDraft = (options: {
  readonly cwd: string;
  readonly id: string;
  readonly credentials: AgentFeedCredentials;
  readonly reviewBaseUrl?: string | null;
}) => Promise<PublishDraftResult>;
type ReadDraft = (cwd: string, id: string) => Promise<LocalDraft>;
type SanitizeDraftForOutput = (cwd: string, draft: LocalDraft) => Promise<LocalDraft>;
type MarkCollectionComplete = (cwd: string, window: CollectionWindow | null | undefined, createdAt: Date) => Promise<void>;
type ShouldOpenReviewAfterUpload = (openFlag: boolean, options: ReviewOpenPolicyOptions) => Promise<boolean>;
type HandoffReviewUrl = (reviewUrl: string, options: ReviewUrlHandoffOptions) => Promise<ReviewUrlHandoff>;

export type ShareUploadDependencies = {
  readonly requireUploadPreflight?: RequireUploadPreflight;
  readonly publishDraft?: PublishDraft;
  readonly readDraft?: ReadDraft;
  readonly sanitizeDraftForOutput?: SanitizeDraftForOutput;
  readonly markCollectionComplete?: MarkCollectionComplete;
  readonly shouldOpenReviewAfterUpload?: ShouldOpenReviewAfterUpload;
  readonly handoffReviewUrl?: HandoffReviewUrl;
};

export type ShareUploadOptions = {
  readonly cwd: string;
  readonly draft: LocalDraft;
  readonly credentials: AgentFeedCredentials;
  readonly flags: ShareUploadFlags;
  readonly dependencies?: ShareUploadDependencies;
};

export type ShareUploadConfirmationRequired = {
  readonly kind: 'confirmation_required';
  readonly draft: LocalDraft;
  readonly command: string;
  readonly extraCommand: string;
};

export type ShareUploadComplete = {
  readonly kind: 'uploaded';
  readonly draft: LocalDraft;
  readonly upload: PublishDraftResult;
  readonly handoff: ReviewUrlHandoff;
};

export type ShareUploadResult = ShareUploadConfirmationRequired | ShareUploadComplete;

async function defaultSanitizeDraftForOutput(cwd: string, draft: LocalDraft): Promise<LocalDraft> {
  scanAndRedactDraftPublicFields(draft);
  await writeDraft(cwd, draft);
  return draft;
}

async function markCursorIfNeeded(options: ShareUploadOptions, draft: LocalDraft): Promise<void> {
  if (options.flags.noSaveCursor) return;
  const markCollectionComplete = options.dependencies?.markCollectionComplete ?? defaultMarkCollectionComplete;
  await markCollectionComplete(options.cwd, draft.source.collection_window, new Date(draft.source.created_at));
}

async function uploadedDraftForOutput(options: ShareUploadOptions): Promise<LocalDraft> {
  if (!options.flags.json) return options.draft;
  const readDraft = options.dependencies?.readDraft ?? defaultReadDraft;
  const sanitizeDraftForOutput = options.dependencies?.sanitizeDraftForOutput ?? defaultSanitizeDraftForOutput;
  return await sanitizeDraftForOutput(options.cwd, await readDraft(options.cwd, options.draft.id));
}

async function shouldOpenReview(options: ShareUploadOptions): Promise<boolean> {
  const shouldOpenReviewAfterUpload = options.dependencies?.shouldOpenReviewAfterUpload ?? defaultShouldOpenReviewAfterUpload;
  if (options.flags.json) {
    return await shouldOpenReviewAfterUpload(options.flags.openReview, { respectConfig: false, noOpen: options.flags.noOpenReview });
  }
  return await shouldOpenReviewAfterUpload(options.flags.openReview, { noOpen: options.flags.noOpenReview });
}

function shouldCopyReview(flags: ShareUploadFlags): boolean {
  if (flags.json) return shouldCopyReviewUrl({ json: true, noClipboard: flags.noClipboard, clipboard: flags.clipboard });
  return shouldCopyReviewUrl({ noClipboard: flags.noClipboard });
}

export async function runShareUploadCommand(options: ShareUploadOptions): Promise<ShareUploadResult> {
  if (!options.flags.json && shouldRequireUploadConfirmation({ yes: options.flags.yes })) {
    return {
      kind: 'confirmation_required',
      draft: options.draft,
      command: `agentfeed publish --id ${options.draft.id} --yes`,
      extraCommand: 'agentfeed share --yes'
    };
  }

  const requireUploadPreflight = options.dependencies?.requireUploadPreflight ?? defaultRequireUploadPreflight;
  const publishDraft = options.dependencies?.publishDraft ?? defaultPublishDraft;
  const metadata = await requireUploadPreflight(options.credentials);
  const upload = await publishDraft({
    cwd: options.cwd,
    id: options.draft.id,
    credentials: options.credentials,
    reviewBaseUrl: metadata.review_base_url
  });
  const draft = await uploadedDraftForOutput(options);
  await markCursorIfNeeded(options, draft);
  const handoffReviewUrl = options.dependencies?.handoffReviewUrl ?? defaultHandoffReviewUrl;
  const handoff = await handoffReviewUrl(upload.review_url, {
    copy: shouldCopyReview(options.flags),
    open: await shouldOpenReview(options),
    apiBaseUrl: options.credentials.api_base_url,
    reviewBaseUrl: upload.review_base_url ?? metadata.review_base_url
  });
  return { kind: 'uploaded', draft, upload, handoff };
}
