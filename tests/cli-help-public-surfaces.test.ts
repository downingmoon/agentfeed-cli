import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-help-surfaces-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1' }
  });
}

async function runCliWithEnv(args: readonly string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1', FORCE_COLOR: undefined, ...env }
  });
}

describe('CLI public command help surfaces', () => {
  it('prints example-driven help for the main review workflow commands', async () => {
    const expectations: Array<[string[], string[]]> = [
      [['share', '--help'], ['Examples:', 'agentfeed share --dry', 'agentfeed share --dry --explain', 'agentfeed share --yes --open-review']],
      [['publish', '--help'], ['Examples:', 'agentfeed publish --latest --yes', 'agentfeed publish --latest --json --clipboard']],
      [['scan', '--help'], ['Examples:', 'agentfeed scan --latest --dry-run', 'agentfeed scan --path .']],
      [['hook', '--help'], ['Examples:', 'agentfeed hook install claude-code --dry-run', 'agentfeed hook uninstall claude-code']],
      [['open', '--help'], ['Examples:', 'agentfeed open --latest', 'agentfeed open --id draft_20260606_120000_abcd']],
    ];

    for (const [args, expectedLines] of expectations) {
      const { stdout, stderr } = await runCli(args);
      expect(stderr).toBe('');
      for (const line of expectedLines) expect(stdout).toContain(line);
      expect(stdout).not.toContain('Usage: agentfeed <command>');
    }
  });

  it('keeps every public help surface readable in narrow terminals', async () => {
    const helpSurfaces: string[][] = [
      ['--help'],
      ['help', '--help'],
      ['commands', '--help'],
      ['init', '--help'],
      ['login', '--help'],
      ['logout', '--help'],
      ['status', '--help'],
      ['rotate', '--help'],
      ['version', '--help'],
      ['token', 'rotate', '--help'],
      ['collect', '--help'],
      ['share', '--help'],
      ['preview', '--help'],
      ['publish', '--help'],
      ['scan', '--help'],
      ['hook', '--help'],
      ['doctor', '--help'],
      ['drafts', '--help'],
      ['discard', '--help'],
      ['open', '--help'],
      ['completion', '--help']
    ];

    for (const args of helpSurfaces) {
      const { stdout, stderr } = await runCliWithEnv(args, { COLUMNS: '56', AGENTFEED_PLAIN: '1' });
      expect(stderr).toBe('');
      const longLines = stdout
        .split(/\r?\n/)
        .filter((line) => line.length > 80)
        .map((line) => `${line.length}:${line}`);
      expect(longLines, `agentfeed ${args.join(' ')}`).toEqual([]);
    }
  });

  it('explains when to use every public command help surface', async () => {
    const helpSurfaces: string[][] = [
      ['help', '--help'],
      ['commands', '--help'],
      ['init', '--help'],
      ['login', '--help'],
      ['logout', '--help'],
      ['status', '--help'],
      ['rotate', '--help'],
      ['version', '--help'],
      ['token', 'rotate', '--help'],
      ['collect', '--help'],
      ['share', '--help'],
      ['preview', '--help'],
      ['publish', '--help'],
      ['scan', '--help'],
      ['hook', '--help'],
      ['doctor', '--help'],
      ['drafts', '--help'],
      ['discard', '--help'],
      ['open', '--help'],
      ['completion', '--help']
    ];

    for (const args of helpSurfaces) {
      const { stdout, stderr } = await runCli(args);
      expect(stderr).toBe('');
      expect(stdout, `agentfeed ${args.join(' ')}`).toContain('When to use:');
      expect(stdout, `agentfeed ${args.join(' ')}`).not.toContain('Usage: agentfeed <command>');
    }
  });

  it('prints command-specific help for every public command surface', async () => {
    const expectations: Array<[string[], string[]]> = [
      [['help', '--help'], ['Usage: agentfeed help', 'agentfeed help collect', 'agentfeed <command> --help']],
      [['commands', '--help'], ['Usage: agentfeed commands', 'command catalog', '--json']],
      [['init', '--help'], ['Usage: agentfeed init', '--project-name', '--no-git-check', '--force']],
      [['login', '--help'], ['Usage: agentfeed login', '--token-stdin', '--no-open', '--json', 'Examples:', 'Safety:', 'agentfeed login --no-open']],
      [['logout', '--help'], ['Usage: agentfeed logout', '--json', 'Examples:', 'Safety:', 'agentfeed status']],
      [['status', '--help'], ['Usage: agentfeed status', 'credential, API, project', '--json']],
      [['rotate', '--help'], ['Usage: agentfeed rotate', '--browser', '--api-base-url', 'Examples:', 'Safety:', 'agentfeed rotate --no-open']],
      [['version', '--help'], ['Usage: agentfeed version', 'agentfeed --version', '--json']],
      [['token', 'rotate', '--help'], ['Usage: agentfeed token rotate', 'Compatibility alias for:', 'agentfeed rotate']],
      [['collect', '--help'], ['Usage: agentfeed collect', '--source <source>', '--no-save-cursor']],
      [['share', '--help'], ['Usage: agentfeed share', '--note <text>', '--explain', '--no-save-cursor', '--run-configured-commands']],
      [['preview', '--help'], ['Usage: agentfeed preview', '--remote', '--json']],
      [['publish', '--help'], ['Usage: agentfeed publish', '--open-review', '--json']],
      [['scan', '--help'], ['Usage: agentfeed scan', '--path <path>', '--dry-run']],
      [['hook', '--help'], ['Usage: agentfeed hook', '--settings-path', 'claude-code']],
      [['doctor', '--help'], ['Usage: agentfeed doctor', 'diagnostics', '--json']],
      [['drafts', '--help'], ['Usage: agentfeed drafts', '--json']],
      [['discard', '--help'], ['Usage: agentfeed discard', '--latest', '--id', '--yes', '--json']],
      [['open', '--help'], ['Usage: agentfeed open', '--latest', '--id', '--json']],
      [['completion', '--help'], ['Usage: agentfeed completion <shell>', 'zsh', 'bash', 'fish']],
    ];

    for (const [args, expectedLines] of expectations) {
      const { stdout, stderr } = await runCli(args);
      expect(stderr).toBe('');
      for (const line of expectedLines) expect(stdout).toContain(line);
      expect(stdout).not.toContain('Usage: agentfeed <command>');
    }
  });

  it('prints login-specific help for login --help', async () => {
    const { stdout, stderr } = await runCli(['login', '--help']);

    expect(stdout).toContain('Usage: agentfeed login');
    expect(stdout).toContain('--token-stdin');
    expect(stdout).toContain('--no-open');
    expect(stdout).toContain('--no-save');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('agentfeed login --no-open');
    expect(stdout).toContain('printf %s "$TOKEN" | agentfeed login --token-stdin');
    expect(stdout).toContain('Safety:');
    expect(stdout).toContain('tokens do not appear in shell history');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed collect --source codex');
    expect(stderr).toBe('');
  });

  it('prints rotate-specific safety examples for rotate --help', async () => {
    const { stdout, stderr } = await runCli(['rotate', '--help']);

    expect(stdout).toContain('Usage: agentfeed rotate');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('agentfeed rotate --no-open');
    expect(stdout).toContain('agentfeed rotate --browser');
    expect(stdout).toContain('Safety:');
    expect(stdout).toContain('revokes the previous saved token');
    expect(stdout).toContain('AGENTFEED_TOKEN');
    expect(stderr).toBe('');
  });

  it('prints logout-specific safety guidance for logout --help', async () => {
    const { stdout, stderr } = await runCli(['logout', '--help']);

    expect(stdout).toContain('Usage: agentfeed logout');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('agentfeed logout --json');
    expect(stdout).toContain('Safety:');
    expect(stdout).toContain('saved by the CLI');
    expect(stdout).toContain('AGENTFEED_TOKEN');
    expect(stdout).toContain('agentfeed status after logout');
    expect(stderr).toBe('');
  });
});
