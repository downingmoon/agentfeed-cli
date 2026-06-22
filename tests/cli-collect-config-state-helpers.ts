import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CommandFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

export type CollectDraftOutput = {
  readonly id: string;
  readonly warnings?: readonly string[];
  readonly source?: { readonly collection_window?: { readonly since?: string | null; readonly until?: string | null } };
  readonly worklog?: unknown;
  readonly draft?: unknown;
  readonly draft_id?: unknown;
  readonly next_actions?: readonly string[];
};

export type CollectErrorOutput = {
  readonly error: {
    readonly message: string;
    readonly details?: readonly string[];
  };
};

export type CollectConfigStateFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly writeSource: (content: string) => Promise<void>;
  readonly runCollect: (args: readonly string[]) => string;
  readonly runCollectExpectingFailure: (args: readonly string[]) => Promise<CommandFailure>;
};

export function useCollectConfigStateFixture(): CollectConfigStateFixture {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-config-state-'));
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
    runCollect: (args: readonly string[]) => execFileSync(process.execPath, [cliPath, 'collect', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    }),
    runCollectExpectingFailure: (args: readonly string[]) => runCollectExpectingFailure(dir, home, args)
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCollectDraftOutput(stdout: string): CollectDraftOutput {
  const value: unknown = JSON.parse(stdout);
  if (!isRecord(value)) throw new Error('collect output must be a JSON object');
  const source = isRecord(value.source) ? value.source : undefined;
  const collectionWindow = source && isRecord(source.collection_window) ? source.collection_window : undefined;
  return {
    id: stringField(value, 'id'),
    warnings: optionalStringArray(value.warnings),
    source: source
      ? {
        collection_window: collectionWindow
          ? {
            since: typeof collectionWindow.since === 'string' || collectionWindow.since === null ? collectionWindow.since : undefined,
            until: typeof collectionWindow.until === 'string' || collectionWindow.until === null ? collectionWindow.until : undefined
          }
          : undefined
      }
      : undefined,
    worklog: value.worklog,
    draft: value.draft,
    draft_id: value.draft_id,
    next_actions: optionalStringArray(value.next_actions)
  };
}

export function parseCollectErrorOutput(stdout: string | undefined): CollectErrorOutput {
  const value: unknown = JSON.parse(stdout ?? '{}');
  if (!isRecord(value) || !isRecord(value.error)) throw new Error('collect error output must contain error object');
  const error = value.error;
  return {
    error: {
      message: stringField(error, 'message'),
      details: optionalStringArray(error.details)
    }
  };
}

function stringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string') throw new Error(`expected string field: ${key}`);
  return field;
}

function optionalStringArray(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error('expected optional string array');
  }
  return value;
}

async function runCollectExpectingFailure(dir: string, home: string, args: readonly string[]): Promise<CommandFailure> {
  try {
    await execFileAsync(process.execPath, [cliPath, 'collect', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
  } catch (error) {
    return commandFailureFrom(error);
  }
  throw new Error('expected collect command to fail');
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
