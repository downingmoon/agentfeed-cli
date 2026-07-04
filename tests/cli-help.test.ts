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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-help-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1' }
  });
}

const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/;

async function runCliWithEnv(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1', FORCE_COLOR: undefined, ...env }
  });
}

async function runCliFailureWithEnv(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  try {
    await runCliWithEnv(args, env);
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

describe('CLI help and option validation', () => {
  it('prints concise root help with command catalog and command-help guidance', async () => {
    const { stdout, stderr } = await runCli(['--help']);

    expect(stdout).toContain('Usage: agentfeed <command>');
    expect(stdout).toContain('Global options:');
    expect(stdout).toContain('agentfeed --version');
    expect(stdout).toContain('agentfeed -v');
    expect(stdout).toContain('agentfeed version');
    expect(stdout).toContain('Help:');
    expect(stdout).toContain('agentfeed help');
    expect(stdout).toContain('agentfeed commands');
    expect(stdout).toContain('agentfeed help <command>');
    expect(stdout).toContain('agentfeed <command> help');
    expect(stdout).toContain('Quickstart:');
    expect(stdout).toContain('agentfeed init');
    expect(stdout).toContain('agentfeed login');
    expect(stdout).toContain('agentfeed share --dry');
    expect(stdout).toContain('agentfeed share --yes --open-review');
    expect(stdout).toContain('Headless login:');
    expect(stdout).toContain('agentfeed login --token-stdin');
    expect(stdout).toContain('agentfeed login --token - --no-save');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('Start:');
    expect(stdout).toContain('help');
    expect(stdout).toContain('Show root or command-specific help');
    expect(stdout).toContain('commands');
    expect(stdout).toContain('List available AgentFeed commands');
    expect(stdout).toContain('Share work:');
    expect(stdout).toContain('Privacy and drafts:');
    expect(stdout).toContain('Automation:');
    expect(stdout).toContain('Account and diagnostics:');
    expect(stdout).toContain('agentfeed <command> --help');
    expect(stdout).toContain('collect');
    expect(stdout).toContain('Collect local agent work into a private review draft');
    expect(stdout).toContain('share');
    expect(stdout).toContain('Collect, preview, and optionally upload in one workflow');
    expect(stdout).toContain('doctor');
    expect(stdout).toContain('Run local diagnostics');
    expect(stdout).toContain('version');
    expect(stdout).toContain('Print the installed AgentFeed CLI version');
    expect(stdout).toContain('completion');
    expect(stdout).toContain('Print shell completion script');
    expect(stdout).not.toContain('agentfeed collect --source codex');
    expect(stdout).not.toContain('agentfeed publish --id <draft_id> --yes');
    expect(stdout).not.toContain('agentfeed token rotate');
    expect(stdout).not.toContain('agentfeed collect --upload');
    expect(stdout).not.toContain('agentfeed preview --remote');
    expect(stderr).toBe('');
  });

  it('prints help without ANSI escapes when NO_COLOR is set', async () => {
    const { stdout, stderr } = await runCliWithEnv(['--help'], { NO_COLOR: '1' });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stderr).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('prints unknown-command errors without ANSI escapes when NO_COLOR is set', async () => {
    const failure = await runCliFailureWithEnv(['statsu'], { NO_COLOR: '1' });

    expect(failure.stderr).toContain('Did you mean: agentfeed status');
    expect(failure.stderr).toContain('Run: agentfeed --help');
    expect(failure.stderr).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(failure.stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('prints unknown-command errors without ANSI escapes when stderr is not a TTY', async () => {
    const failure = await runCliFailureWithEnv(['statsu'], { NO_COLOR: '' });

    expect(failure.stderr).toContain('Did you mean: agentfeed status');
    expect(failure.stderr).toContain('Run: agentfeed --help');
    expect(failure.stderr).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(failure.stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('colors recovery command lines when color output is forced', async () => {
    const leading = await runCliFailureWithEnv(['--dry'], { FORCE_COLOR: '1', NO_COLOR: undefined });
    expect(leading.stderr).toContain('\u001B[31mOption appears before command: --dry');
    expect(leading.stderr).toMatch(/\u001B\[90mTry: agentfeed share --dry\u001B\[39m/);
    expect(leading.stderr).toMatch(/\u001B\[90mRun: agentfeed --help\u001B\[39m/);

    const option = await runCliFailureWithEnv(['status', '--bogus'], { FORCE_COLOR: '1', NO_COLOR: undefined });
    expect(option.stderr).toMatch(/\u001B\[90mCommand: agentfeed status\u001B\[39m/);
    expect(option.stderr).toMatch(/\u001B\[90mRun: agentfeed status --help\u001B\[39m/);
  });

  it('prints help without ANSI escapes when stdout is not a TTY', async () => {
    const { stdout, stderr } = await runCliWithEnv(['--help'], { NO_COLOR: '' });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stderr).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('prints collect-specific help for collect --help', async () => {
    const { stdout, stderr } = await runCli(['collect', '--help']);

    expect(stdout).toContain('Usage: agentfeed collect');
    expect(stdout).toContain('--source <source>');
    expect(stdout).toContain('Omit --source to auto-detect Claude/Codex/Cursor/Gemini/Antigravity logs.');
    expect(stdout).toContain('Override source (auto-detect is default)');
    expect(stdout).toContain('Values: claude-code, codex, cursor, gemini-cli, antigravity-cli, other');
    expect(stdout).toContain('--session-file <path>');
    expect(stdout).toContain('--no-save-cursor');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('agentfeed collect --explain');
    expect(stdout).toContain('agentfeed collect --json --no-save-cursor');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed login --token-stdin');
    expect(stderr).toBe('');
  });

  it('supports natural help command aliases for root and command-specific help', async () => {
    const root = await runCli(['help']);
    expect(root.stderr).toBe('');
    expect(root.stdout).toContain('Usage: agentfeed <command>');
    expect(root.stdout).toContain('Quickstart:');

    const collectTopic = await runCli(['help', 'collect']);
    expect(collectTopic.stderr).toBe('');
    expect(collectTopic.stdout).toContain('Usage: agentfeed collect');
    expect(collectTopic.stdout).toContain('agentfeed collect --explain');
    expect(collectTopic.stdout).not.toContain('Usage: agentfeed <command>');

    const trailingHelp = await runCli(['collect', 'help']);
    expect(trailingHelp.stderr).toBe('');
    expect(trailingHelp.stdout).toContain('Usage: agentfeed collect');
    expect(trailingHelp.stdout).toContain('--source <source>');

    const tokenHelp = await runCli(['help', 'token', 'rotate']);
    expect(tokenHelp.stderr).toBe('');
    expect(tokenHelp.stdout).toContain('Usage: agentfeed token rotate');
    expect(tokenHelp.stdout).toContain('Compatibility alias for:');

    const commandsHelp = await runCli(['help', 'commands']);
    expect(commandsHelp.stderr).toBe('');
    expect(commandsHelp.stdout).toContain('Usage: agentfeed commands');
    expect(commandsHelp.stdout).toContain('--json');
  });

  it('prints version through command, global flags, and machine-readable JSON', async () => {
    const command = await runCli(['version']);
    const longFlag = await runCli(['--version']);
    const shortFlag = await runCli(['-v']);
    const json = await runCli(['version', '--json']);
    const helpTopic = await runCli(['help', 'version']);
    const trailingHelp = await runCli(['version', 'help']);

    expect(command.stderr).toBe('');
    expect(command.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(longFlag.stdout.trim()).toBe(command.stdout.trim());
    expect(shortFlag.stdout.trim()).toBe(command.stdout.trim());
    expect(JSON.parse(json.stdout)).toEqual({ version: command.stdout.trim() });
    expect(helpTopic.stdout).toContain('Usage: agentfeed version');
    expect(trailingHelp.stdout).toContain('Usage: agentfeed version');
  });

});
