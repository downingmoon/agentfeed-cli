import { chmod } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentFeedCredentials } from '../types.js';
import { DEFAULT_API_BASE_URL } from './defaults.js';
import { ensureDir, pathExists, readJson, writeJson } from '../utils/fs.js';

export function homeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || process.cwd();
}

export function globalAgentFeedDir(): string {
  return join(homeDir(), '.agentfeed');
}

export function credentialsPath(): string {
  return join(globalAgentFeedDir(), 'credentials.json');
}

export async function saveCredentials(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user'] } = {}): Promise<AgentFeedCredentials> {
  const credentials: AgentFeedCredentials = {
    api_base_url: options.apiBaseUrl || process.env.AGENTFEED_API_BASE_URL || DEFAULT_API_BASE_URL,
    ingestion_token: token,
    user: options.user,
    created_at: new Date().toISOString()
  };
  await ensureDir(globalAgentFeedDir());
  await writeJson(credentialsPath(), credentials);
  try { await chmod(credentialsPath(), 0o600); } catch { /* warn at command layer if needed */ }
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
    api_base_url: process.env.AGENTFEED_API_BASE_URL || base?.api_base_url || DEFAULT_API_BASE_URL,
    ingestion_token: token,
    user: base?.user,
    created_at: base?.created_at || new Date().toISOString()
  };
}
