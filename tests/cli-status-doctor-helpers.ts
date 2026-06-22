import { beforeAll, afterEach, beforeEach } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

export const repoRoot = resolve('.');
export const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
export const execFileAsync = promisify(execFile);
export const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/;

export let dir: string;
export let home: string;

export function useStatusDoctorCliEnvironment(): void {
  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-status-'));
    home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });
}
