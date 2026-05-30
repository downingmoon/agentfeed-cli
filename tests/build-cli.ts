import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function latestSourceMtimeMs(dir: string): number {
  let latest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      latest = Math.max(latest, latestSourceMtimeMs(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      latest = Math.max(latest, statSync(fullPath).mtimeMs);
    }
  }
  return latest;
}

function buildStampIsFresh(repoRoot: string, stampPath: string): boolean {
  if (!existsSync(stampPath)) return false;
  if (!existsSync(join(repoRoot, 'dist', 'cli', 'index.js'))) return false;
  const stampMtime = statSync(stampPath).mtimeMs;
  const sourceMtime = latestSourceMtimeMs(join(repoRoot, 'src'));
  const configMtime = Math.max(
    statSync(join(repoRoot, 'package.json')).mtimeMs,
    statSync(join(repoRoot, 'tsconfig.json')).mtimeMs,
  );
  return stampMtime >= Math.max(sourceMtime, configMtime);
}

export function ensureCliBuilt(repoRoot: string): void {
  const stampPath = join(repoRoot, '.agentfeed-test-build.stamp');
  const lockPath = join(repoRoot, '.agentfeed-test-build.lock');
  const lockTimeoutMs = 120_000;
  const startedAt = Date.now();

  while (true) {
    try {
      mkdirSync(lockPath);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;
      if (Date.now() - startedAt > lockTimeoutMs) {
        rmSync(lockPath, { recursive: true, force: true });
        continue;
      }
      sleepSync(50);
    }
  }

  try {
    if (buildStampIsFresh(repoRoot, stampPath)) return;
    execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'ignore' });
    writeFileSync(stampPath, new Date().toISOString());
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}
