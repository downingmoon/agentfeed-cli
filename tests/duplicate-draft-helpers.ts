import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { initProject, loadProjectConfig } from '../src/config/project-config.js';

type ProjectConfig = Awaited<ReturnType<typeof initProject>>['config'];

export type DuplicateDraftFixture = {
  readonly dir: () => string;
  readonly writeJsonl: (path: string, rows: readonly unknown[]) => Promise<void>;
  readonly updateProjectConfig: (mutator: (config: ProjectConfig) => void) => Promise<void>;
};

export function useDuplicateDraftFixture(): DuplicateDraftFixture {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-duplicate-'));
    execFileSync('git', ['init'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
    const { config } = await initProject({ cwd: dir, noGitCheck: false });
    config.agents.claude_code.enabled = false;
    config.agents.codex.enabled = false;
    config.agents.cursor.enabled = false;
    config.agents.gemini_cli.enabled = false;
    await writeFile(join(dir, '.agentfeed', 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
    await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
  }

  async function updateProjectConfig(mutator: (config: ProjectConfig) => void): Promise<void> {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = await loadProjectConfig(dir);
    mutator(config);
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  }

  return {
    dir: () => dir,
    writeJsonl,
    updateProjectConfig
  };
}
