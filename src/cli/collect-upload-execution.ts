import { publishDraft as defaultPublishDraft, type ApiMetadata, type PublishDraftResult } from '../api/client.js';
import { readDraft as defaultReadDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../types.js';
import { handoffReviewUrl as defaultHandoffReviewUrl, type ReviewUrlHandoffOptions } from './review-handoff.js';
import { requireUploadPreflight as defaultRequireUploadPreflight } from './upload-preflight.js';

type RequireUploadPreflight = (credentials: AgentFeedCredentials, options: { readonly retryCommand?: string }) => Promise<ApiMetadata>;
type PublishDraft = (options: {
  readonly cwd: string;
  readonly id: string;
  readonly credentials: AgentFeedCredentials;
  readonly reviewBaseUrl?: string | null;
}) => Promise<PublishDraftResult>;
type ReadDraft = (cwd: string, id: string) => Promise<LocalDraft>;
type SanitizeDraftForOutput = (cwd: string, draft: LocalDraft) => Promise<LocalDraft>;
type HandoffReviewUrl = (reviewUrl: string, options: ReviewUrlHandoffOptions) => Promise<ReviewUrlHandoff>;

export type CollectJsonUploadDependencies = {
  readonly requireUploadPreflight?: RequireUploadPreflight;
  readonly publishDraft?: PublishDraft;
  readonly readDraft?: ReadDraft;
  readonly sanitizeDraftForOutput?: SanitizeDraftForOutput;
  readonly handoffReviewUrl?: HandoffReviewUrl;
};

export type CollectJsonUploadOptions = {
  readonly cwd: string;
  readonly draft: LocalDraft;
  readonly credentials: AgentFeedCredentials;
  readonly openReview: boolean;
  readonly dependencies?: CollectJsonUploadDependencies;
};

async function defaultSanitizeDraftForOutput(cwd: string, draft: LocalDraft): Promise<LocalDraft> {
  scanAndRedactDraftPublicFields(draft);
  await writeDraft(cwd, draft);
  return draft;
}

export async function runCollectJsonUploadCommand(options: CollectJsonUploadOptions): Promise<LocalDraft> {
  const requireUploadPreflight = options.dependencies?.requireUploadPreflight ?? defaultRequireUploadPreflight;
  const publishDraft = options.dependencies?.publishDraft ?? defaultPublishDraft;
  const readDraft = options.dependencies?.readDraft ?? defaultReadDraft;
  const sanitizeDraftForOutput = options.dependencies?.sanitizeDraftForOutput ?? defaultSanitizeDraftForOutput;
  const metadata = await requireUploadPreflight(options.credentials, { retryCommand: 'agentfeed collect --json --upload' });
  const upload = await publishDraft({
    cwd: options.cwd,
    id: options.draft.id,
    credentials: options.credentials,
    reviewBaseUrl: metadata.review_base_url
  });
  const draft = await sanitizeDraftForOutput(options.cwd, await readDraft(options.cwd, options.draft.id));
  if (options.openReview) {
    const handoffReviewUrl = options.dependencies?.handoffReviewUrl ?? defaultHandoffReviewUrl;
    draft.upload.handoff = await handoffReviewUrl(upload.review_url, {
      copy: false,
      open: true,
      apiBaseUrl: options.credentials.api_base_url,
      reviewBaseUrl: upload.review_base_url ?? metadata.review_base_url
    });
  }
  return draft;
}
