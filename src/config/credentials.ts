import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentFeedCredentials } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { resolveApiBaseUrl } from './api-base.js';

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
  if (!(await pathExists(credentialsPath()))) {
    if (process.env.AGENTFEED_TOKEN) return resolveCredentials(null);
    return null;
  }
  return resolveCredentials(await readJson<AgentFeedCredentials>(credentialsPath()));
}

export async function resolveCredentials(base: AgentFeedCredentials | null): Promise<AgentFeedCredentials> {
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  if (!token) throw new Error('AgentFeed token is missing. Run: agentfeed login --token <token>');
  return {
    api_base_url: await resolveApiBaseUrl({ storedApiBaseUrl: base?.api_base_url }),
    ingestion_token: token,
    user: base?.user,
    created_at: base?.created_at || new Date().toISOString()
  };
}
