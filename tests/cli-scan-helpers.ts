import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');

export const scanSecret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';

export type CliScanFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly draftPath: (draftId: string) => string;
  readonly runScan: (args: readonly string[]) => string;
};

export function useCliScanFixture(): CliScanFixture {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-scan-'));
    home = await mkdtemp(join(tmpdir(), 'agentfeed-cli-home-'));
    await initProject({ cwd: dir, noGitCheck: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  function runScan(args: readonly string[]): string {
    return execFileSync(process.execPath, [cliPath, 'scan', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
  }

  return {
    dir: () => dir,
    home: () => home,
    draftPath: (draftId: string) => join(dir, '.agentfeed', 'drafts', `${draftId}.json`),
    runScan
  };
}
