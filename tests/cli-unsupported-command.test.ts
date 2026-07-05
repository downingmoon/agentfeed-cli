import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
}, 30_000);

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-unsupported-command-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: readonly string[]): Promise<{ readonly stdout: string; readonly stderr: string; readonly code: number | null }> {
  try {
    const result = await execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1' }
    });
    return { ...result, code: 0 };
  } catch (error) {
    if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
      const failed = error as Error & { readonly stdout: string; readonly stderr: string; readonly code: number | null };
      return { stdout: failed.stdout, stderr: failed.stderr, code: failed.code };
    }
    throw error;
  }
}

describe('unsupported command handling', () => {
  it('treats unsupported invocations as ordinary unknown commands', async () => {
    // Given / When: an unsupported invocation reaches the current CLI.
    const result = await runCli(['hook', '--help']);

    // Then: the CLI reports the standard unknown-command surface.
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: hook');
    expect(result.stderr).toContain('Run: agentfeed --help');
    expect(result.stderr).not.toContain('Deprecated command:');
    expect(result.stderr).not.toContain('legacy command');
    expect(result.stderr).not.toContain('Usage: agentfeed');
  });
});
