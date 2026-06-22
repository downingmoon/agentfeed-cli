import { afterEach, beforeAll, beforeEach } from 'vitest';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import type { LocalDraft } from '../src/types.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CliOutput = { readonly stdout: string; readonly stderr: string };
type ServerHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
type TestServer = { readonly apiBaseUrl: string; readonly close: () => Promise<void> };

export async function startUploadPreflightFailureServer(handler: ServerHandler): Promise<TestServer> {
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return {
    apiBaseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}

export function writeCompatibleMetadataResponse(res: ServerResponse): void {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    data: {
      service: 'agentfeed-api',
      api_version: 'v1',
      backend_version: '0.1.0',
      contract_version: '2026-06-03',
      review_base_url: 'http://localhost:3001',
      supported_clients: {
        cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' },
      },
    },
  }));
}

export function writeIncompatibleContractMetadataResponse(res: ServerResponse): void {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    data: {
      service: 'agentfeed-api',
      api_version: 'v1',
      backend_version: '0.1.0',
      contract_version: '1999-01-01',
      supported_clients: {
        cli: { min_version: '99.0.0', contract_version: '1999-01-01' },
      },
    },
  }));
}

export function writeInvalidTokenResponse(res: ServerResponse): void {
  res.writeHead(401, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }));
}

export function useUploadPreflightFailureFixture() {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-upload-preflight-'));
    home = await mkdtemp(join(tmpdir(), 'agentfeed-cli-home-'));
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
  });

  function createDraft(): LocalDraft {
    return createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
  }

  async function writeDraftFile(draft: LocalDraft): Promise<void> {
    await writeDraft(dir, draft);
  }

  async function writeCodexShareSession(sessionId: string, model: string, exportName: string): Promise<string> {
    const sessionFile = join(dir, '.agentfeed', `${sessionId}.jsonl`);
    await writeFile(sessionFile, [
      JSON.stringify({ timestamp: '2026-05-31T00:00:00Z', type: 'session_meta', payload: { id: sessionId, cwd: dir, model } }),
      JSON.stringify({ timestamp: '2026-05-31T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 31 } } } }),
      JSON.stringify({ timestamp: '2026-05-31T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: `--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const ${exportName} = true;\n` },
      } } }),
    ].join('\n') + '\n');
    await writeFile(join(dir, 'src', 'api.ts'), `export const ok = true;\nexport const ${exportName} = true;\n`);
    return sessionFile;
  }

  function spawnJsonAttempt(args: readonly string[], env: NodeJS.ProcessEnv): Promise<CliOutput> {
    return new Promise(resolve => {
      const child = spawn(process.execPath, [cliPath, ...args], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', error => { stderr += String(error); });
      child.on('close', () => resolve({ stdout, stderr }));
    });
  }

  async function runPublishAttempt(args: readonly string[], env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    try {
      await execFileAsync(process.execPath, [cliPath, 'publish', ...args], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, HOME: home, ...env },
      });
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
    }
    throw new Error(`Expected agentfeed publish ${args.join(' ')} to fail`);
  }

  return { createDraft, home: () => home, runPublishAttempt, spawnJsonAttempt, writeCodexShareSession, writeDraftFile };
}
