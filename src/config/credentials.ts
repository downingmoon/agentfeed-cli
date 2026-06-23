import type { AgentFeedCredentials } from '../types.js';
import { pathExists } from '../utils/fs.js';
import { DEFAULT_API_BASE_URL } from './defaults.js';
import { normalizeApiBaseUrl, resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlResolution } from './api-base.js';
import { savedApiBaseWarnings, savedTokenApiBaseOverrideWarnings } from './credentials-api-base-warnings.js';
import { credentialsPath, readCredentialsFile, type PersistedCredentialStore, type StoredCredentialRecord } from './credentials-file.js';
import { deleteStoredCredentials, saveCredentialRecord, tokenFromStoredCredentials, type CredentialStoreOptions } from './credentials-store.js';
export { credentialsPath, globalAgentFeedDir, homeDir, resolveHomeDir } from './credentials-file.js';

export type CredentialTokenSource = 'environment' | 'credentials_file' | 'keychain' | 'missing';
export type CredentialStorePreference = 'auto' | 'file' | 'keychain';

export interface SecretStore {
  service: string;
  account: string;
  isAvailable(): Promise<boolean>;
  read(): Promise<string | null>;
  write(secret: string): Promise<void>;
  delete?(): Promise<void>;
}

export interface CredentialsResolution {
  credentials: AgentFeedCredentials | null;
  token_source: CredentialTokenSource;
  credentials_file_path: string;
  credentials_file_exists: boolean;
  credential_store: PersistedCredentialStore | 'environment' | 'missing';
  api_base_url?: string;
  api_base_url_source?: ApiBaseUrlResolution['source'];
  api_base_url_source_detail?: string;
  warnings: string[];
}

export interface CredentialsDeleteResult {
  credentials_file_path: string;
  credentials_file_deleted: boolean;
  keychain_deleted: boolean | null;
  warnings: string[];
}

function trustRepoApiBaseForAuthenticatedUse(): boolean {
  return process.env.AGENTFEED_TRUST_REPO_API_BASE === '1';
}

function protectRepoDiscoveredApiBase(
  api: ApiBaseUrlResolution,
  hasToken: boolean,
): ApiBaseUrlResolution {
  if (!hasToken || api.source !== 'env_file' || trustRepoApiBaseForAuthenticatedUse()) return api;
  const detail = api.source_detail ? ` (${api.source_detail})` : '';
  return {
    value: normalizeApiBaseUrl(DEFAULT_API_BASE_URL),
    source: 'default',
    warnings: [
      ...api.warnings,
      `ignored repo-local API base${detail} for authenticated token use; set AGENTFEED_TRUST_REPO_API_BASE=1 to explicitly trust this checkout.`
    ]
  };
}

function savedApiBaseUrlForTokenSource(base: StoredCredentialRecord | null, tokenSource: CredentialTokenSource): string | undefined {
  if (tokenSource === 'environment') return undefined;
  return base?.api_base_url;
}

export async function credentialsFromToken(token: string, options: { apiBaseUrl?: string; tokenId?: string | null; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } = {}): Promise<AgentFeedCredentials> {
  return {
    api_base_url: await resolveApiBaseUrl({ explicitApiBaseUrl: options.apiBaseUrl, cwd: options.cwd, trustRepoDiscoveredApiBase: options.trustRepoDiscoveredApiBase }),
    ingestion_token: token,
    token_id: options.tokenId ?? null,
    token_expires_at: options.tokenExpiresAt ?? null,
    user: options.user,
    created_at: new Date().toISOString()
  };
}

export async function saveCredentials(token: string, options: { apiBaseUrl?: string; tokenId?: string | null; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } & CredentialStoreOptions = {}): Promise<AgentFeedCredentials> {
  const credentials = await credentialsFromToken(token, options);
  await saveCredentialRecord(token, credentials, options);
  return credentials;
}

export async function deleteSavedCredentials(options: CredentialStoreOptions = {}): Promise<CredentialsDeleteResult> {
  return deleteStoredCredentials(options);
}

export async function loadCredentials(): Promise<AgentFeedCredentials | null> {
  return (await loadCredentialsWithMetadata()).credentials;
}

function missingTokenMessage(): string {
  return [
    'AgentFeed token is missing.',
    'Run: agentfeed login',
    'Run: printf %s "$TOKEN" | agentfeed login --token-stdin'
  ].join('\n');
}

export async function resolveCredentials(base: AgentFeedCredentials | null): Promise<AgentFeedCredentials> {
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  if (!token) throw new Error(missingTokenMessage());
  const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN ? 'environment' : 'credentials_file';
  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ storedApiBaseUrl: savedApiBaseUrlForTokenSource(base, tokenSource) }),
    Boolean(token),
  );
  const apiBaseUrl = api.value;
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  return {
    api_base_url: apiBaseUrl,
    ingestion_token: token,
    token_id: process.env.AGENTFEED_TOKEN ? null : base?.token_id ?? null,
    token_expires_at: tokenExpiresAt,
    user: base?.user,
    created_at: base?.created_at || new Date().toISOString()
  };
}

export async function loadCredentialsWithMetadata(options: { cwd?: string } & CredentialStoreOptions = {}): Promise<CredentialsResolution> {
  const file = credentialsPath();
  const fileExists = await pathExists(file);
  const fileResult = fileExists ? await readCredentialsFile(file) : { credentials: null, warnings: [] };
  const base = fileResult.credentials;
  const stored = process.env.AGENTFEED_TOKEN
    ? { token: null, source: 'missing' as const, warnings: [] }
    : await tokenFromStoredCredentials(base, options);
  const token = process.env.AGENTFEED_TOKEN || stored.token;
  const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN
    ? 'environment'
    : stored.token
      ? stored.source
      : 'missing';

  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ cwd: options.cwd, storedApiBaseUrl: savedApiBaseUrlForTokenSource(base, tokenSource) }),
    Boolean(token),
  );
  const persistedStoreWarning = typeof base?.credential_store_warning === 'string' && base.credential_store_warning.trim()
    ? base.credential_store_warning
    : null;
  const warnings = [
    ...fileResult.warnings,
    ...stored.warnings,
    ...(persistedStoreWarning && tokenSource === 'credentials_file' ? [persistedStoreWarning] : []),
    ...savedApiBaseWarnings(base, tokenSource),
    ...savedTokenApiBaseOverrideWarnings(base, tokenSource, api),
    ...api.warnings
  ];
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  const credentialStore = process.env.AGENTFEED_TOKEN
    ? 'environment'
    : tokenSource === 'keychain'
      ? 'keychain'
      : tokenSource === 'credentials_file'
        ? 'file'
        : base?.credential_store === 'keychain'
          ? 'keychain'
          : 'missing';

  if (!token) {
    return {
      credentials: null,
      token_source: 'missing',
      credentials_file_path: file,
      credentials_file_exists: fileExists,
      credential_store: credentialStore,
      api_base_url: api.value,
      api_base_url_source: api.source,
      api_base_url_source_detail: api.source_detail,
      warnings
    };
  }

  return {
    credentials: {
      api_base_url: api.value,
      ingestion_token: token,
      token_id: process.env.AGENTFEED_TOKEN ? null : base?.token_id ?? null,
      token_expires_at: tokenExpiresAt,
      user: base?.user,
      created_at: base?.created_at || new Date().toISOString()
    },
    token_source: tokenSource,
    credentials_file_path: file,
    credentials_file_exists: fileExists,
    credential_store: credentialStore,
    api_base_url: api.value,
    api_base_url_source: api.source,
    api_base_url_source_detail: api.source_detail,
    warnings
  };
}
