import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CommandFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

let dir: string;
let home: string;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

async function runCollectExpectingFailure(args: readonly string[]): Promise<CommandFailure> {
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

function parseJsonObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('expected JSON object');
  return value;
}

function stringArrayField(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error('expected string array');
  }
  return value;
}

describe('collect command UX and validation', () => {
  it('prints polished human-readable explain output with draft summary and next-step sections', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "human-explain";\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'collect',
      '--explain',
      '--all',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed draft');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('ID:');
    expect(stdout).toContain('Title:');
    expect(stdout).toContain('Signals');
    expect(stdout).toContain('Agent:');
    expect(stdout).toContain('Metrics:');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed preview --id');
    expect(stdout).toContain('  2. agentfeed publish --id');
  });

  it('prints subcommand help without collecting or updating local state', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'collect', '--help'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('Usage: agentfeed collect');
    expect(stdout).toContain('--source <source>');
    expect(stdout).toContain('--session-file <path>');
    expect(stdout).toContain('--dry, --dry-run');
    expect(stdout).toContain('agentfeed collect --dry-run --explain');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed login --token-stdin');
    expect(stderr).toBe('');
    await expect(readdir(join(dir, '.agentfeed', 'drafts'))).resolves.toEqual([]);
    await expect(readFile(join(dir, '.agentfeed', 'state.json'), 'utf8')).rejects.toThrow();
  });

  it('accepts collect dry-run as an explicit local-only alias', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "collect-dry-run";\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'collect',
      '--dry-run',
      '--explain',
      '--all',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('Mode: dry run (local draft only; no upload attempted)');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('agentfeed publish --id');
  });

  it('surfaces explicit session-file misses in human collect output', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "missing-session-warning";\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'collect',
      '--source',
      'codex',
      '--session-file',
      'missing-codex-session.jsonl',
      '--all',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('Warnings');
    expect(stdout).toContain('Agent session file was not found: missing-codex-session.jsonl');
    expect(stdout).toContain('without --session-file to use auto-discovery');
  });

  it('surfaces explicit session-file parse misses in JSON collect output', async () => {
    await writeFile(join(dir, 'codex-session.jsonl'), 'not-json\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'collect',
      '--source',
      'codex',
      '--session-file',
      'codex-session.jsonl',
      '--json',
      '--all',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stderr).toBe('');
    const output = parseJsonObject(stdout);
    const warnings = stringArrayField(output.warnings).join('\n');
    expect(warnings).toContain('Agent session file did not produce usable metrics: codex-session.jsonl');
    expect(warnings).toContain('outside the collection window, unrelated to this project, or unsupported for the selected source');
  });

  it('rejects contradictory collect dry-run upload flags before creating a draft', async () => {
    const failure = await runCollectExpectingFailure(['--dry-run', '--upload']);

    expect(failure.stderr ?? '').toContain('Conflicting options for collect: --dry-run and --upload');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --help');
  });

  it('rejects unsupported source values before creating a draft', async () => {
    const failure = await runCollectExpectingFailure([
      '--source',
      'gemni-cli',
      '--no-save-cursor'
    ]);

    expect(failure.stderr ?? '').toContain('Unsupported agent source: gemni-cli');
    expect(failure.stderr ?? '').toContain('Supported sources: claude-code, codex, cursor, gemini-cli, other');
    expect(failure.stderr ?? '').toContain('Tip: omit --source to let AgentFeed auto-detect Claude/Codex/Cursor/Gemini sessions.');
    expect(failure.stderr ?? '').toContain('Did you mean: --source gemini-cli');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --explain');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --source gemini-cli --explain');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --help');
  });
});
