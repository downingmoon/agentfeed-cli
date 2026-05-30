import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
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

function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1') return true;
  if (host === '0.0.0.0') return true;
  if (isIP(host) === 4 && host.startsWith('127.')) return true;
  return false;
}

function fileDiscoveredApiBaseUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(normalizeApiBaseUrl(value));
  } catch {
    return null;
  }
  return isLoopbackHostname(url.hostname) ? url.toString().replace(/\/$/, '') : null;
}

function localApiBaseUrlFromBackendPort(value: string): string | null {
  const port = value.trim();
  if (!/^\d{1,5}$/.test(port)) return null;
  const parsed = Number(port);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) return null;
  return `http://localhost:${parsed}/v1`;
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
    if (env.AGENTFEED_API_BASE_URL) {
      const discovered = fileDiscoveredApiBaseUrl(env.AGENTFEED_API_BASE_URL);
      if (discovered) return discovered;
    }
    if (env.BACKEND_PORT) {
      const discovered = localApiBaseUrlFromBackendPort(env.BACKEND_PORT);
      if (discovered) return discovered;
    }
  }
  return null;
}

export async function resolveApiBaseUrl(options: { cwd?: string; explicitApiBaseUrl?: string; storedApiBaseUrl?: string } = {}): Promise<string> {
  return normalizeApiBaseUrl(
    options.explicitApiBaseUrl ||
    process.env.AGENTFEED_API_BASE_URL ||
    options.storedApiBaseUrl ||
    await discoverApiBaseUrl(options.cwd) ||
    DEFAULT_API_BASE_URL
  );
}
