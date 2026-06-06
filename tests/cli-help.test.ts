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

async function runCliFailure(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    await runCli(args);
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
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('agentfeed <command> --help');
    expect(stdout).toContain('collect');
    expect(stdout).toContain('share');
    expect(stdout).toContain('doctor');
    expect(stdout).toContain('completion');
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

  it('prints help without ANSI escapes when stdout is not a TTY', async () => {
    const { stdout, stderr } = await runCliWithEnv(['--help'], { NO_COLOR: '' });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stderr).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('prints collect-specific help for collect --help', async () => {
    const { stdout, stderr } = await runCli(['collect', '--help']);

    expect(stdout).toContain('Usage: agentfeed collect');
    expect(stdout).toContain('--source <source>');
    expect(stdout).toContain('--session-file <path>');
    expect(stdout).toContain('--no-save-cursor');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed login --token-stdin');
    expect(stderr).toBe('');
  });

  it('prints login-specific help for login --help', async () => {
    const { stdout, stderr } = await runCli(['login', '--help']);

    expect(stdout).toContain('Usage: agentfeed login');
    expect(stdout).toContain('--token-stdin');
    expect(stdout).toContain('--no-open');
    expect(stdout).toContain('--no-save');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed collect --source codex');
    expect(stderr).toBe('');
  });

  it('rejects unknown options before running a command', async () => {
    const failure = await runCliFailure(['status', '--bogus']);

    expect(failure.stderr).toContain('Unknown option: --bogus');
    expect(failure.stderr).toContain('Run: agentfeed status --help');
    expect(failure.stdout).toBe('');
  });

  it('suggests status when an unknown command is a close typo', async () => {
    const failure = await runCliFailure(['statsu']);

    expect(failure.stderr).toContain('Unknown command: statsu');
    expect(failure.stderr).toContain('Did you mean: agentfeed status');
    expect(failure.stderr).toContain('Run: agentfeed --help');
    expect(failure.stdout).toBe('');
  });

  it('suggests --open-review when share receives a close option typo', async () => {
    const failure = await runCliFailure(['share', '--opne-review']);

    expect(failure.stderr).toContain('Unknown option: --opne-review');
    expect(failure.stderr).toContain('Did you mean: --open-review');
    expect(failure.stderr).toContain('Run: agentfeed share --help');
    expect(failure.stdout).toBe('');
  });

  it('rejects collect when --source is missing a value', async () => {
    const failure = await runCliFailure(['collect', '--source']);

    expect(failure.stderr).toContain('--source requires a value');
    expect(failure.stdout).toBe('');
  });

  it('rejects login when --api-base-url is missing a value', async () => {
    const failure = await runCliFailure(['login', '--api-base-url']);

    expect(failure.stderr).toContain('--api-base-url requires a value');
    expect(failure.stdout).toBe('');
  });

  it('prints completion-specific help for completion --help', async () => {
    const { stdout, stderr } = await runCli(['completion', '--help']);

    expect(stdout).toContain('Usage: agentfeed completion <shell>');
    expect(stdout).toContain('zsh');
    expect(stdout).toContain('bash');
    expect(stdout).toContain('fish');
    expect(stderr).toBe('');
  });

  it('prints a zsh completion script for completion zsh', async () => {
    const { stdout, stderr } = await runCli(['completion', 'zsh']);

    expect(stdout).toContain('#compdef agentfeed');
    expect(stdout).toContain('_agentfeed');
    expect(stdout).toContain('agentfeed');
    expect(stderr).toBe('');
  });

  it('prints a bash completion script for completion bash', async () => {
    const { stdout, stderr } = await runCli(['completion', 'bash']);

    expect(stdout).toContain('_agentfeed()');
    expect(stdout).toContain('complete -F _agentfeed agentfeed');
    expect(stderr).toBe('');
  });

  it('prints a fish completion script for completion fish', async () => {
    const { stdout, stderr } = await runCli(['completion', 'fish']);

    expect(stdout).toContain('complete -c agentfeed');
    expect(stdout).toContain('completion');
    expect(stderr).toBe('');
  });
});
