import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

export type CliFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

export type CliErrorOutput = {
  readonly error: { readonly message: string };
  readonly next_actions?: readonly string[];
};

export type CollectUploadFailureFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly writeSource: (content: string) => Promise<void>;
  readonly runCollectFailure: (args: readonly string[], env: NodeJS.ProcessEnv) => Promise<CliFailure | undefined>;
};

export function useCollectUploadFailureFixture(): CollectUploadFailureFixture {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-upload-failure-'));
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

  return {
    dir: () => dir,
    home: () => home,
    writeSource: (content: string) => writeFile(join(dir, 'src', 'api.ts'), content),
    runCollectFailure: (args: readonly string[], env: NodeJS.ProcessEnv) => runCollectFailure(dir, args, env)
  };
}

async function runCollectFailure(cwd: string, args: readonly string[], env: NodeJS.ProcessEnv): Promise<CliFailure | undefined> {
  try {
    await execFileAsync(process.execPath, [cliPath, 'collect', ...args], {
      cwd,
      encoding: 'utf8',
      env
    });
    return undefined;
  } catch (error) {
    return cliFailureFrom(error);
  }
}

export function handleCompatibleMetadata(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/metadata') return false;
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
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
      }
    }
  }));
  return true;
}

function handleHealthyIngestionToken(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/ingest/status') return false;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    data: {
      ok: true,
      user: { id: 'user_collect_test', username: 'downingmoon', display_name: 'Downing Moon', avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4' },
      token: { id: 'token_collect_test', name: 'CLI collect test token', created_at: '2026-06-01T00:00:00.000Z', last_used_at: null, expires_at: '2026-06-15T00:00:00.000Z', expires_in_seconds: 604800, expiring_soon: false }
    }
  }));
  return true;
}

export function handleUploadPreflight(req: IncomingMessage, res: ServerResponse): boolean {
  return handleCompatibleMetadata(req, res) || handleHealthyIngestionToken(req, res);
}

export async function listenOnLocalhost(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return address.port;
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cliFailureFrom(error: unknown): CliFailure {
  if (!isRecord(error)) return {};
  const stdout = error.stdout;
  const stderr = error.stderr;
  return {
    stdout: typeof stdout === 'string' ? stdout : undefined,
    stderr: typeof stderr === 'string' ? stderr : undefined
  };
}

export function parseCliErrorOutput(stdout: string | undefined): CliErrorOutput {
  const value: unknown = JSON.parse(stdout ?? '{}');
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.message !== 'string') {
    throw new Error('CLI error output did not match the expected JSON contract');
  }
  const nextActions = value.next_actions;
  return {
    error: { message: value.error.message },
    next_actions: Array.isArray(nextActions) && nextActions.every((item): item is string => typeof item === 'string')
      ? nextActions
      : undefined
  };
}

export async function drainRequestBody(req: IncomingMessage): Promise<void> {
  for await (const chunk of req) {
    if (chunk instanceof Buffer) continue;
  }
}
