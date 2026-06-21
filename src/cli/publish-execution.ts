import { cachedUploadReuseStatusForCredentials, publishDraft as defaultPublishDraft, type ApiMetadata, type CachedUploadReuseFailureReason, type PublishDraftResult } from '../api/client.js';
import { loadCredentialsWithMetadata as defaultLoadCredentialsWithMetadata, type CredentialsResolution } from '../config/credentials.js';
import { readDraft as defaultReadDraft } from '../draft/read.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../types.js';
import { missingTokenMessage } from './auth-token-input.js';
import { apiBaseSourceLabel, credentialSourceLabel, credentialStoreLabel } from './diagnostic-formatters.js';
import { handoffReviewUrl as defaultHandoffReviewUrl, shouldCopyReviewUrl, type ReviewUrlHandoffOptions } from './review-handoff.js';
import { shouldOpenReviewAfterUpload as defaultShouldOpenReviewAfterUpload, type ReviewOpenPolicyOptions } from './runtime-policy.js';
import { requireUploadPreflight as defaultRequireUploadPreflight } from './upload-preflight.js';
import type { UploadCredentialContext, UploadPreflightOptions } from './upload-guidance.js';

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
type LoadCredentialsWithMetadata = (options: { readonly cwd?: string }) => Promise<CredentialsResolution>;
type RequireUploadPreflight = (credentials: AgentFeedCredentials, options: UploadPreflightOptions) => Promise<ApiMetadata>;
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
  readonly loadCredentialsWithMetadata?: LoadCredentialsWithMetadata;
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

function credentialResolutionFromLegacyLoader(credentials: AgentFeedCredentials | null): CredentialsResolution {
  return {
    credentials,
    token_source: credentials ? 'credentials_file' : 'missing',
    credentials_file_path: '',
    credentials_file_exists: false,
    credential_store: credentials ? 'file' : 'missing',
    ...(credentials ? { api_base_url: credentials.api_base_url } : {}),
    warnings: []
  };
}

async function loadPublishCredentialResolution(options: PublishCommandOptions): Promise<CredentialsResolution> {
  if (options.dependencies?.loadCredentialsWithMetadata) {
    return await options.dependencies.loadCredentialsWithMetadata({ cwd: options.cwd });
  }
  if (options.dependencies?.loadCredentials) {
    return credentialResolutionFromLegacyLoader(await options.dependencies.loadCredentials());
  }
  return await defaultLoadCredentialsWithMetadata({ cwd: options.cwd });
}

function publishCredentialContext(resolution: CredentialsResolution, credentials: AgentFeedCredentials): UploadCredentialContext {
  return {
    tokenSourceLabel: credentialSourceLabel(resolution.token_source),
    credentialStoreLabel: credentialStoreLabel(resolution.credential_store),
    apiBaseUrl: credentials.api_base_url,
    ...(resolution.api_base_url_source ? { apiBaseSourceLabel: apiBaseSourceLabel(resolution.api_base_url_source, resolution.api_base_url_source_detail) } : {}),
    ...(resolution.credentials_file_path ? { credentialsFilePath: resolution.credentials_file_path } : {})
  };
}

export async function runPublishCommand(options: PublishCommandOptions): Promise<PublishCommandResult> {
  const readDraft = options.dependencies?.readDraft ?? defaultReadDraft;
  const requireUploadPreflight = options.dependencies?.requireUploadPreflight ?? defaultRequireUploadPreflight;
  const publishDraft = options.dependencies?.publishDraft ?? defaultPublishDraft;
  const handoffReviewUrl = options.dependencies?.handoffReviewUrl ?? defaultHandoffReviewUrl;
  const existingDraft = await readDraft(options.cwd, options.id);
  const credentialResolution = await loadPublishCredentialResolution(options);
  const credentials = credentialResolution.credentials;
  if (!credentials) throw new Error(missingTokenMessage());

  const cacheReuseStatus = cachedUploadReuseStatusForCredentials(existingDraft, credentials);
  if (!cacheReuseStatus.reusable && !options.flags.json && !options.flags.yes) {
    return uploadConfirmationResult(existingDraft, cacheReuseStatus.reason);
  }

  const metadata = await requireUploadPreflight(credentials, {
    retryCommand: `agentfeed publish --id ${options.id} --yes`,
    credentialContext: publishCredentialContext(credentialResolution, credentials)
  });
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
