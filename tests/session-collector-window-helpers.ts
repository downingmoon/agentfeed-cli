import { afterEach, beforeEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export type SessionCollectorFixture = {
  readonly dir: () => string;
  readonly writeJsonl: (path: string, rows: readonly unknown[]) => Promise<void>;
};

export function useSessionCollectorFixture(): SessionCollectorFixture {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-'));
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
    writeJsonl,
  };
}

async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}
