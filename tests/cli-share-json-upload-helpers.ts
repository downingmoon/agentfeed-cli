import { afterEach, beforeAll, beforeEach } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
export const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
export const execFileAsync = promisify(execFile);

function compatibleMetadataPayload() {
  return {
    data: {
      service: 'agentfeed-api',
      api_version: 'v1',
      backend_version: '0.1.0',
      contract_version: '2026-06-03',
      review_base_url: 'http://localhost:3001',
      supported_clients: {
        cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
      }
    }
  };
}

function handleCompatibleMetadata(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/metadata') return false;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(compatibleMetadataPayload()));
  return true;
}

function handleHealthyIngestionToken(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/ingest/status') return false;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    data: {
      ok: true,
      user: {
        id: 'user_test',
        username: 'downingmoon',
        display_name: 'Downing Moon',
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
      },
      token: {
        id: 'token_test',
        name: 'CLI test token',
        created_at: '2026-06-01T00:00:00.000Z',
        last_used_at: null,
        expires_at: '2026-06-15T00:00:00.000Z',
        expires_in_seconds: 604800,
        expiring_soon: false
      }
    }
  }));
  return true;
}

export function handleShareJsonUploadPreflight(req: IncomingMessage, res: ServerResponse): boolean {
  return handleCompatibleMetadata(req, res) || handleHealthyIngestionToken(req, res);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readShareJsonUploadRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!isRecord(parsed)) throw new Error('request body must be a JSON object');
  return parsed;
}

export async function installFakeBrowserOpener(binDir: string): Promise<string> {
  const logPath = join(binDir, 'browser-open.log');
  const script = '#!/usr/bin/env sh\necho "$1" >> "$AGENTFEED_TEST_BROWSER_LOG"\nexit 0\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['open', 'xdg-open', 'wslview'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
  return logPath;
}

export async function installFakeClipboard(binDir: string): Promise<string> {
  const logPath = join(binDir, 'clipboard.log');
  const script = '#!/usr/bin/env sh\ncat >> "$AGENTFEED_TEST_CLIPBOARD_LOG"\nexit 0\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['pbcopy', 'xclip', 'wl-copy', 'xsel', 'clip.exe'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
  return logPath;
}

export async function installFailingReviewUrlHandoff(binDir: string): Promise<void> {
  const script = '#!/usr/bin/env sh\nexit 1\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['open', 'xdg-open', 'wslview', 'pbcopy', 'xclip', 'wl-copy', 'xsel', 'clip.exe'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
}

let fixtureDir = '';

export async function writeCodexShareSession(sessionId: string, model: string, exportName: string): Promise<string> {
  const cwd = fixtureDir;
  const sessionFile = join(cwd, '.agentfeed', `${sessionId}.jsonl`);
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-31T00:00:00Z', type: 'session_meta', payload: { id: sessionId, cwd, model } }),
    JSON.stringify({ timestamp: '2026-05-31T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 31 } } } }),
    JSON.stringify({ timestamp: '2026-05-31T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(cwd, 'src', 'api.ts')]: { type: 'modify', unified_diff: `--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const ${exportName} = true;\n` }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(cwd, 'src', 'api.ts'), `export const ok = true;\nexport const ${exportName} = true;\n`);
  return sessionFile;
}

export function useShareJsonUploadFixture() {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-share-json-'));
    home = await mkdtemp(join(tmpdir(), 'agentfeed-cli-home-'));
    fixtureDir = dir;
    execFileSync('git', ['init'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
    await initProject({ cwd: dir, noGitCheck: false });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
    fixtureDir = '';
  });

  return {
    cliPath,
    dir: () => dir,
    execFileAsync,
    home: () => home
  };
}
