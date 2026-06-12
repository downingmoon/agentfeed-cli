import {
  checkApiCompatibility as defaultCheckApiCompatibility,
  checkIngestionToken as defaultCheckIngestionToken,
  type ApiCheckResult,
  type ApiCompatibilityCheckResult,
  type ApiMetadata
} from '../api/client.js';
import type { AgentFeedCredentials } from '../types.js';
import {
  apiCheckFailureDetail,
  apiCompatibilityFailureDetail,
  apiCompatibilityRecoveryCommands,
  formatUploadRecoveryMessage,
  ingestionTokenRecoveryCommands,
  type UploadPreflightOptions
} from './upload-guidance.js';

export type UploadPreflightChecks = {
  readonly checkApiCompatibility?: (apiBaseUrl: string) => Promise<ApiCompatibilityCheckResult>;
  readonly checkIngestionToken?: (credentials: AgentFeedCredentials) => Promise<ApiCheckResult>;
};

export type UploadPreflightCheckOptions = UploadPreflightOptions & UploadPreflightChecks;

export async function requireApiCompatibilityBeforeUpload(apiBaseUrl: string, options: UploadPreflightCheckOptions = {}): Promise<ApiMetadata> {
  const checkApiCompatibility = options.checkApiCompatibility ?? defaultCheckApiCompatibility;
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible && result.data) return result.data;
  throw new Error(formatUploadRecoveryMessage(
    `API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)} before uploading drafts.`,
    apiCompatibilityRecoveryCommands(result),
    options.retryCommand
  ));
}

export async function requireIngestionTokenBeforeUpload(credentials: AgentFeedCredentials, options: UploadPreflightCheckOptions = {}): Promise<void> {
  const checkIngestionToken = options.checkIngestionToken ?? defaultCheckIngestionToken;
  const result = await checkIngestionToken(credentials);
  if (result.ok) return;
  throw new Error(formatUploadRecoveryMessage(
    `Ingestion token check failed for ${result.url}: ${apiCheckFailureDetail(result)} before uploading drafts.`,
    ingestionTokenRecoveryCommands(result),
    options.retryCommand
  ));
}

export async function requireUploadPreflight(credentials: AgentFeedCredentials, options: UploadPreflightCheckOptions = {}): Promise<ApiMetadata> {
  const metadata = await requireApiCompatibilityBeforeUpload(credentials.api_base_url, options);
  await requireIngestionTokenBeforeUpload(credentials, options);
  return metadata;
}

export async function requireApiCompatibilityBeforeCredentialSave(apiBaseUrl: string, options: UploadPreflightChecks = {}): Promise<void> {
  const checkApiCompatibility = options.checkApiCompatibility ?? defaultCheckApiCompatibility;
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible) return;
  throw new Error([
    `API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)} before saving credentials.`,
    'Run: agentfeed doctor'
  ].join('\n'));
}
