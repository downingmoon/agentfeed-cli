import { execFile, execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import type { IncomingMessage, Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';
import { handleUploadPreflight } from './cli-collect-upload-failure-helpers.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

export { handleUploadPreflight };

export type CliOutput = {
  readonly stdout: string;
  readonly stderr: string;
};

export type CommandFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

export type CollectDraftOutput = {
  readonly id: string;
  readonly next_actions?: readonly string[];
};

export type CollectErrorOutput = {
  readonly error: { readonly message: string };
  readonly next_actions?: readonly string[];
};

export type CollectJsonUploadFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly runCollect: (args: readonly string[], env: NodeJS.ProcessEnv) => Promise<CliOutput>;
  readonly runCollectExpectingFailure: (args: readonly string[], env: NodeJS.ProcessEnv) => Promise<CommandFailure>;
};

export function useCollectJsonUploadFixture(): CollectJsonUploadFixture {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-'));
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

  async function runCollect(args: readonly string[], env: NodeJS.ProcessEnv): Promise<CliOutput> {
    const result = await execFileAsync(process.execPath, [cliPath, 'collect', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env
    });
    return { stdout: String(result.stdout), stderr: String(result.stderr) };
  }

  async function runCollectExpectingFailure(args: readonly string[], env: NodeJS.ProcessEnv): Promise<CommandFailure> {
    try {
      await runCollect(args, env);
    } catch (error) {
      return commandFailureFrom(error);
    }
    throw new Error('expected collect command to fail');
  }

  return {
    dir: () => dir,
    home: () => home,
    runCollect,
    runCollectExpectingFailure
  };
}

export function parseCollectDraftOutput(stdout: string): CollectDraftOutput {
  const value: unknown = JSON.parse(stdout);
  if (!isRecord(value)) throw new Error('collect output must be a JSON object');
  return {
    id: stringField(value, 'id'),
    next_actions: stringArrayField(value.next_actions)
  };
}

export function parseCollectErrorOutput(stdout: string | undefined): CollectErrorOutput {
  const value: unknown = JSON.parse(stdout ?? '{}');
  if (!isRecord(value) || !isRecord(value.error)) throw new Error('collect error output must contain error object');
  return {
    error: { message: stringField(value.error, 'message') },
    next_actions: stringArrayField(value.next_actions)
  };
}

export async function countDraftJsonFiles(dir: string): Promise<number> {
  const draftFiles = await readdir(join(dir, '.agentfeed', 'drafts')).catch((): string[] => []);
  return draftFiles.filter((file) => file.endsWith('.json')).length;
}

export async function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!isRecord(value)) throw new Error('request body did not contain a JSON object');
  return value;
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

export async function createFailingBrowserBin(): Promise<string> {
  const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-collect-open-fail-bin-'));
  const script = '#!/usr/bin/env sh\nexit 1\n';
  await Promise.all(['open', 'xdg-open', 'wslview'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
  return binDir;
}

function commandFailureFrom(error: unknown): CommandFailure {
  if (!isRecord(error)) return {};
  const stdout = error.stdout;
  const stderr = error.stderr;
  return {
    stdout: typeof stdout === 'string' ? stdout : undefined,
    stderr: typeof stderr === 'string' ? stderr : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string') throw new Error(`expected string field: ${key}`);
  return field;
}

function stringArrayField(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error('expected optional string array');
  }
  return value;
}
