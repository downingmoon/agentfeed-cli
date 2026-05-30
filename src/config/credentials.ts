import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentFeedCredentials } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlResolution } from './api-base.js';

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

export async function credentialsFromToken(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user'] } = {}): Promise<AgentFeedCredentials> {
  return {
    api_base_url: await resolveApiBaseUrl({ explicitApiBaseUrl: options.apiBaseUrl }),
    ingestion_token: token,
    user: options.user,
    created_at: new Date().toISOString()
  };
}

export async function saveCredentials(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user'] } = {}): Promise<AgentFeedCredentials> {
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
  const apiBaseUrl = await resolveApiBaseUrl({ storedApiBaseUrl: base?.api_base_url });
  return {
    api_base_url: apiBaseUrl,
    ingestion_token: token,
    user: base?.user,
    created_at: base?.created_at || new Date().toISOString()
  };
}

export async function loadCredentialsWithMetadata(options: { cwd?: string } = {}): Promise<CredentialsResolution> {
  const file = credentialsPath();
  const fileExists = await pathExists(file);
  const base = fileExists ? await readJson<AgentFeedCredentials>(file) : null;
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN
    ? 'environment'
    : base?.ingestion_token
      ? 'credentials_file'
      : 'missing';

  const api = await resolveApiBaseUrlWithMetadata({ cwd: options.cwd, storedApiBaseUrl: base?.api_base_url });
  if (!token) {
    return {
      credentials: null,
      token_source: 'missing',
      credentials_file_path: file,
      credentials_file_exists: fileExists,
      api_base_url: api.value,
      api_base_url_source: api.source,
      api_base_url_source_detail: api.source_detail,
      warnings: api.warnings
    };
  }

  return {
    credentials: {
      api_base_url: api.value,
      ingestion_token: token,
      user: base?.user,
      created_at: base?.created_at || new Date().toISOString()
    },
    token_source: tokenSource,
    credentials_file_path: file,
    credentials_file_exists: fileExists,
    api_base_url: api.value,
    api_base_url_source: api.source,
    api_base_url_source_detail: api.source_detail,
    warnings: api.warnings
  };
}
