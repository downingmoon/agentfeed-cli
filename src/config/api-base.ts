import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { DEFAULT_API_BASE_URL } from './defaults.js';
import { pathExists } from '../utils/fs.js';

function parseEnvValue(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    values[match[1]] = parseEnvValue(match[2]);
  }
  return values;
}

function ancestorDirs(cwd: string): string[] {
  const dirs: string[] = [];
  let current = resolve(cwd);
  for (let i = 0; i < 8; i += 1) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

function candidateEnvFiles(cwd: string): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const dir of ancestorDirs(cwd)) {
    for (const file of [join(dir, '.env'), join(dir, 'agentfeed-dev', '.env')]) {
      if (!seen.has(file)) {
        seen.add(file);
        files.push(file);
      }
    }
  }
  return files;
}

export function normalizeApiBaseUrl(value: string): string {
  const raw = value.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid AgentFeed API base URL: ${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid AgentFeed API base URL: protocol must be http or https.');
  }
  if (!url.hostname) {
    throw new Error('Invalid AgentFeed API base URL: hostname is required.');
  }
  if (url.username || url.password) {
    throw new Error('Invalid AgentFeed API base URL: credentials are not allowed in the URL.');
  }
  if (url.search || url.hash) {
    throw new Error('Invalid AgentFeed API base URL: do not include query or hash fragments.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export async function discoverApiBaseUrl(cwd = process.cwd()): Promise<string | null> {
  for (const file of candidateEnvFiles(cwd)) {
    if (!(await pathExists(file))) continue;
    const env = parseEnvFile(await readFile(file, 'utf8'));
    if (env.AGENTFEED_API_BASE_URL) return env.AGENTFEED_API_BASE_URL;
    if (env.BACKEND_PORT) return `http://localhost:${env.BACKEND_PORT}/v1`;
  }
  return null;
}

export async function resolveApiBaseUrl(options: { cwd?: string; explicitApiBaseUrl?: string; storedApiBaseUrl?: string } = {}): Promise<string> {
  return normalizeApiBaseUrl(
    options.explicitApiBaseUrl ||
    process.env.AGENTFEED_API_BASE_URL ||
    await discoverApiBaseUrl(options.cwd) ||
    options.storedApiBaseUrl ||
    DEFAULT_API_BASE_URL
  );
}
