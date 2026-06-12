import { isTrustedReviewUrl } from '../api/client.js';
import { loadCredentialsWithMetadata as defaultLoadCredentialsWithMetadata, type CredentialsResolution } from '../config/credentials.js';
import { DEFAULT_API_BASE_URL } from '../config/defaults.js';
import type { LocalDraft } from '../types.js';
import { openBrowser as defaultOpenBrowser } from '../utils/open-browser.js';
import { invalidApiBaseUrlMessage } from './diagnostic-credentials.js';
import { notUploadedDraftMessage } from './open-command.js';

const INVALID_SAVED_REVIEW_URL_MESSAGE = 'Saved draft review URL is invalid. Run agentfeed share again to upload a fresh private review draft.';
const MANUAL_OPEN_WARNING = 'Review URL could not be opened automatically. Open review_url manually.';

type LoadCredentialsWithMetadata = (options: { readonly cwd?: string }) => Promise<CredentialsResolution>;
type OpenBrowser = (reviewUrl: string) => Promise<boolean>;

export type OpenReviewExecutionDependencies = {
  readonly loadCredentialsWithMetadata?: LoadCredentialsWithMetadata;
  readonly openBrowser?: OpenBrowser;
};

export type OpenReviewExecutionOptions = {
  readonly cwd: string;
  readonly draft: LocalDraft;
  readonly dependencies?: OpenReviewExecutionDependencies;
};

export type OpenReviewExecutionResult = {
  readonly draftId: string;
  readonly reviewUrl: string;
  readonly opened: boolean;
  readonly warnings: readonly string[];
  readonly jsonWarnings: readonly string[];
};

async function trustedApiBases(options: OpenReviewExecutionOptions): Promise<{ readonly apiBases: readonly string[]; readonly warnings: readonly string[] }> {
  const apiBases = new Set<string>([DEFAULT_API_BASE_URL]);
  const warnings: string[] = [];
  const loadCredentialsWithMetadata = options.dependencies?.loadCredentialsWithMetadata ?? defaultLoadCredentialsWithMetadata;
  if (options.draft.upload.api_base_url) apiBases.add(options.draft.upload.api_base_url);
  try {
    const credentials = await loadCredentialsWithMetadata({ cwd: options.cwd });
    if (credentials.api_base_url) apiBases.add(credentials.api_base_url);
  } catch (error) {
    const invalidApiMessage = invalidApiBaseUrlMessage(error);
    if (!invalidApiMessage) throw error;
    warnings.push(`ignored invalid AgentFeed API URL while opening a saved review URL: ${invalidApiMessage}`);
  }
  return { apiBases: [...apiBases], warnings };
}

export async function openReviewDraft(options: OpenReviewExecutionOptions): Promise<OpenReviewExecutionResult> {
  const reviewUrl = options.draft.upload.review_url;
  if (!reviewUrl) throw new Error(notUploadedDraftMessage(options.draft.id));

  const trust = await trustedApiBases(options);
  if (!trust.apiBases.some((apiBaseUrl) => isTrustedReviewUrl(reviewUrl, apiBaseUrl, options.draft.upload.review_base_url))) {
    throw new Error(INVALID_SAVED_REVIEW_URL_MESSAGE);
  }

  const openBrowser = options.dependencies?.openBrowser ?? defaultOpenBrowser;
  const opened = await openBrowser(reviewUrl);
  return {
    draftId: options.draft.id,
    reviewUrl,
    opened,
    warnings: trust.warnings,
    jsonWarnings: [
      ...trust.warnings,
      ...(!opened ? [MANUAL_OPEN_WARNING] : [])
    ]
  };
}
