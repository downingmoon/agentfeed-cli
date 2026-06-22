import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { initProject } from '../src/config/project-config.js';

export type SessionCollectorGenericMetadataFixture = {
  readonly dir: () => string;
  readonly initCommittedAgentFeedProject: () => Promise<void>;
};

export function useSessionCollectorGenericMetadataFixture(): SessionCollectorGenericMetadataFixture {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-generic-metadata-'));
    execFileSync('git', ['init'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  return {
    dir: () => dir,
    initCommittedAgentFeedProject: () => initCommittedAgentFeedProject(dir),
  };
}

export async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

async function initCommittedAgentFeedProject(dir: string): Promise<void> {
  await initProject({ cwd: dir, noGitCheck: false });
  execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
}
