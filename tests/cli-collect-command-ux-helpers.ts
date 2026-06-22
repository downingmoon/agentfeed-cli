import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach, expect } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CommandFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

type CommandResult = {
  readonly stdout: string;
  readonly stderr: string;
};

type CollectCommandUxFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly writeSource: (content: string) => Promise<void>;
  readonly writeProjectFile: (path: string, content: string) => Promise<void>;
  readonly runCollect: (args: readonly string[]) => Promise<CommandResult>;
  readonly runCollectExpectingFailure: (args: readonly string[]) => Promise<CommandFailure>;
  readonly expectDraftsEmpty: () => Promise<void>;
  readonly expectStateFileMissing: () => Promise<void>;
};

export function useCollectCommandUxFixture(): CollectCommandUxFixture {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-command-ux-'));
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
    writeProjectFile: (path: string, content: string) => writeFile(join(dir, path), content),
    runCollect: (args: readonly string[]) => runCollect(dir, home, args),
    runCollectExpectingFailure: (args: readonly string[]) => runCollectExpectingFailure(dir, home, args),
    expectDraftsEmpty: () => expect(readdir(join(dir, '.agentfeed', 'drafts'))).resolves.toEqual([]),
    expectStateFileMissing: () => expect(readFile(join(dir, '.agentfeed', 'state.json'), 'utf8')).rejects.toThrow()
  };
}

export function parseJsonObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('expected JSON object');
  return value;
}

export function stringArrayField(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error('expected string array');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function runCollect(dir: string, home: string, args: readonly string[]): Promise<CommandResult> {
  return execFileAsync(process.execPath, [cliPath, 'collect', ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home }
  });
}

async function runCollectExpectingFailure(dir: string, home: string, args: readonly string[]): Promise<CommandFailure> {
  try {
    await runCollect(dir, home, args);
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
