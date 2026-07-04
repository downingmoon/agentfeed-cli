import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { ensureCliBuilt } from './build-cli.js';

export type CliRunResult = {
  readonly stdout: string;
  readonly stderr: string;
};

export type CliInitHarness = {
  readonly projectDir: () => string;
  readonly runCli: (args: readonly string[]) => Promise<CliRunResult>;
  readonly runCliFailure: (args: readonly string[]) => Promise<CliRunResult>;
  readonly initProject: () => Promise<void>;
  readonly readProjectFile: (path: string) => Promise<string>;
  readonly projectFileExists: (path: string) => boolean;
};

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

export function createCliInitHarness(): CliInitHarness {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    home = await mkdtemp(join(homedir(), '.agentfeed-test-home-'));
    dir = await mkdtemp(join(home, 'agentfeed-cli-init-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  async function runCli(args: readonly string[]): Promise<CliRunResult> {
    return execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_CI: '1',
        FORCE_COLOR: undefined
      }
    });
  }

  async function runCliFailure(args: readonly string[]): Promise<CliRunResult> {
    try {
      await runCli(args);
    } catch (error) {
      if (error instanceof Error) return { stdout: failureText(error, 'stdout'), stderr: failureText(error, 'stderr') };
      throw error;
    }
    throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
  }

  async function initProject(): Promise<void> {
    await runCli(['init', '--no-git-check', '--project-name', 'setup-polish']);
  }

  return {
    projectDir: () => dir,
    runCli,
    runCliFailure,
    initProject,
    readProjectFile: (path) => readFile(join(dir, path), 'utf8'),
    projectFileExists: (path) => existsSync(join(dir, path))
  };
}

function failureText(error: Error, key: 'stdout' | 'stderr'): string {
  if (!(key in error)) return '';
  const value = error[key];
  return typeof value === 'string' ? value : '';
}
