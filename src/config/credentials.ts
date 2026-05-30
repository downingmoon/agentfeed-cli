import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentFeedCredentials } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { DEFAULT_API_BASE_URL } from './defaults.js';
import { normalizeApiBaseUrl, resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlResolution } from './api-base.js';

export type CredentialTokenSource = 'environment' | 'credentials_file' | 'missing';

export interface CredentialsResolution {
  credentials: AgentFeedCredentials | null;
  token_source: CredentialTokenSource;
  credentials_file_path: string;
  credentials_file_exists: boolean;
  api_base_url?: string;
  api_base_url_source?: ApiBaseUrlResolution['source'];
  api_base_url_source_detail?: string;
  warnings: string[];
}

export function resolveHomeDir(env: NodeJS.ProcessEnv = process.env, osHome = homedir()): string {
  const home = env.AGENTFEED_HOME || env.HOME || env.USERPROFILE || osHome;
  if (!home?.trim()) {
    throw new Error('Unable to determine a safe AgentFeed home directory. Set AGENTFEED_HOME or HOME before saving credentials.');
  }
  return home;
}

export function homeDir(): string {
  return resolveHomeDir();
}

export function globalAgentFeedDir(): string {
  return join(homeDir(), '.agentfeed');
}

export function credentialsPath(): string {
  return join(globalAgentFeedDir(), 'credentials.json');
}

async function ensurePrivateAgentFeedDir(): Promise<void> {
  const dir = globalAgentFeedDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try { await chmod(dir, 0o700); } catch { /* best-effort on non-POSIX filesystems */ }
}

async function writePrivateCredentialsFile(credentials: AgentFeedCredentials): Promise<void> {
  await writeFile(credentialsPath(), `${JSON.stringify(credentials, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  try { await chmod(credentialsPath(), 0o600); } catch { /* best-effort on non-POSIX filesystems */ }
}

async function readCredentialsFile(file: string): Promise<{ credentials: AgentFeedCredentials | null; warnings: string[] }> {
  try {
    return { credentials: await readJson<AgentFeedCredentials>(file), warnings: [] };
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
    return {
      credentials: null,
      warnings: [`ignored malformed AgentFeed credentials file: ${file}.${reason}`]
    };
  }
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

export async function credentialsFromToken(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } = {}): Promise<AgentFeedCredentials> {
  return {
    api_base_url: await resolveApiBaseUrl({ explicitApiBaseUrl: options.apiBaseUrl, cwd: options.cwd, trustRepoDiscoveredApiBase: options.trustRepoDiscoveredApiBase }),
    ingestion_token: token,
    token_expires_at: options.tokenExpiresAt ?? null,
    user: options.user,
    created_at: new Date().toISOString()
  };
}

export async function saveCredentials(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } = {}): Promise<AgentFeedCredentials> {
  const credentials = await credentialsFromToken(token, options);
  await ensurePrivateAgentFeedDir();
  await writePrivateCredentialsFile(credentials);
  return credentials;
}

export async function loadCredentials(): Promise<AgentFeedCredentials | null> {
  return (await loadCredentialsWithMetadata()).credentials;
}

export async function resolveCredentials(base: AgentFeedCredentials | null): Promise<AgentFeedCredentials> {
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  if (!token) throw new Error('AgentFeed token is missing. Run: agentfeed login --token <token>');
  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ storedApiBaseUrl: base?.api_base_url }),
    Boolean(token),
  );
  const apiBaseUrl = api.value;
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  return {
    api_base_url: apiBaseUrl,
    ingestion_token: token,
    token_expires_at: tokenExpiresAt,
    user: base?.user,
    created_at: base?.created_at || new Date().toISOString()
  };
}

export async function loadCredentialsWithMetadata(options: { cwd?: string } = {}): Promise<CredentialsResolution> {
  const file = credentialsPath();
  const fileExists = await pathExists(file);
  const fileResult = fileExists ? await readCredentialsFile(file) : { credentials: null, warnings: [] };
  const base = fileResult.credentials;
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN
    ? 'environment'
    : base?.ingestion_token
      ? 'credentials_file'
      : 'missing';

  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ cwd: options.cwd, storedApiBaseUrl: base?.api_base_url }),
    Boolean(token),
  );
  const warnings = [...fileResult.warnings, ...api.warnings];
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  if (!token) {
    return {
      credentials: null,
      token_source: 'missing',
      credentials_file_path: file,
      credentials_file_exists: fileExists,
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
      token_expires_at: tokenExpiresAt,
      user: base?.user,
      created_at: base?.created_at || new Date().toISOString()
    },
    token_source: tokenSource,
    credentials_file_path: file,
    credentials_file_exists: fileExists,
    api_base_url: api.value,
    api_base_url_source: api.source,
    api_base_url_source_detail: api.source_detail,
    warnings
  };
}
