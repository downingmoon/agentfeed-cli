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
    expect(stdout).toContain('Global options:');
    expect(stdout).toContain('agentfeed --version');
    expect(stdout).toContain('agentfeed -v');
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

  it('prints help without ANSI escapes when stdout is not a TTY', async () => {
    const { stdout, stderr } = await runCliWithEnv(['--help'], { NO_COLOR: '' });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stderr).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('prints collect-specific help for collect --help', async () => {
    const { stdout, stderr } = await runCli(['collect', '--help']);

    expect(stdout).toContain('Usage: agentfeed collect');
    expect(stdout).toContain('--source <source>');
    expect(stdout).toContain('Omit --source to auto-detect Claude/Codex/Cursor/Gemini sessions and plugins.');
    expect(stdout).toContain('Override auto-detected source');
    expect(stdout).toContain('--session-file <path>');
    expect(stdout).toContain('--no-save-cursor');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('agentfeed collect --explain');
    expect(stdout).toContain('agentfeed collect --json --no-save-cursor');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed login --token-stdin');
    expect(stderr).toBe('');
  });

  it('prints example-driven help for the main review workflow commands', async () => {
    const expectations: Array<[string[], string[]]> = [
      [['share', '--help'], ['Examples:', 'agentfeed share --dry', 'agentfeed share --yes --open-review']],
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

  it('prints command-specific help for every public command surface', async () => {
    const expectations: Array<[string[], string[]]> = [
      [['init', '--help'], ['Usage: agentfeed init', '--project-name', '--no-git-check', '--force']],
      [['login', '--help'], ['Usage: agentfeed login', '--token-stdin', '--no-open']],
      [['logout', '--help'], ['Usage: agentfeed logout', '--json']],
      [['status', '--help'], ['Usage: agentfeed status', 'credential, API, project', '--json']],
      [['rotate', '--help'], ['Usage: agentfeed rotate', '--browser', '--api-base-url']],
      [['token', 'rotate', '--help'], ['Usage: agentfeed token rotate', 'Compatibility alias for:', 'agentfeed rotate']],
      [['collect', '--help'], ['Usage: agentfeed collect', '--source <source>', '--no-save-cursor']],
      [['share', '--help'], ['Usage: agentfeed share', '--note <text>', '--run-configured-commands']],
      [['preview', '--help'], ['Usage: agentfeed preview', '--remote', '--json']],
      [['publish', '--help'], ['Usage: agentfeed publish', '--open-review', '--json']],
      [['scan', '--help'], ['Usage: agentfeed scan', '--path <path>', '--dry-run']],
      [['hook', '--help'], ['Usage: agentfeed hook', '--settings-path', 'claude-code']],
      [['doctor', '--help'], ['Usage: agentfeed doctor', 'diagnostics', '--json']],
      [['drafts', '--help'], ['Usage: agentfeed drafts', '--json']],
      [['discard', '--help'], ['Usage: agentfeed discard', '--latest', '--id', '--yes']],
      [['open', '--help'], ['Usage: agentfeed open', '--latest', '--id']],
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

  it('explains command-first syntax when options are placed before the command', async () => {
    const json = await runCliFailure(['--json', 'status']);
    expect(json.stderr).toContain('Option appears before command: --json');
    expect(json.stderr).toContain('AgentFeed uses command-first syntax: agentfeed <command> [options].');
    expect(json.stderr).toContain('Use: agentfeed status --json');
    expect(json.stderr).toContain('Run: agentfeed status --help');
    expect(json.stderr).not.toContain('Unknown command: --json');
    expect(json.stdout).toBe('');

    const apiBase = await runCliFailure(['--api-base-url', 'http://localhost:8001/v1', 'login']);
    expect(apiBase.stderr).toContain('Option appears before command: --api-base-url');
    expect(apiBase.stderr).toContain('Use: agentfeed login --api-base-url http://localhost:8001/v1');
    expect(apiBase.stderr).toContain('Run: agentfeed login --help');
    expect(apiBase.stderr).not.toContain('AgentFeed browser authorization');
    expect(apiBase.stdout).toBe('');
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

  it('breaks option suggestion ties by shared prefix so --sorce suggests --source', async () => {
    const failure = await runCliFailure(['collect', '--sorce', 'codex']);

    expect(failure.stderr).toContain('Unknown option: --sorce');
    expect(failure.stderr).toContain('Did you mean: --source');
    expect(failure.stderr).not.toContain('Did you mean: --force');
    expect(failure.stderr).toContain('Run: agentfeed collect --help');
    expect(failure.stdout).toBe('');
  });

  it('prints hook recovery commands when hook action or target is missing', async () => {
    const failure = await runCliFailure(['hook']);

    expect(failure.stderr).toContain('Usage: agentfeed hook install|uninstall claude-code');
    expect(failure.stderr).toContain('Run: agentfeed hook --help');
    expect(failure.stderr).toContain('Run: agentfeed hook install claude-code --dry-run');
    expect(failure.stdout).toBe('');
  });

  it('prints supported hook target guidance for unsupported hook targets', async () => {
    const failure = await runCliFailure(['hook', 'install', 'cursor']);

    expect(failure.stderr).toContain('Only claude-code hooks are supported.');
    expect(failure.stderr).toContain('Run: agentfeed hook install claude-code --help');
    expect(failure.stdout).toBe('');
  });

  it('suggests dashed flags when users type option names as arguments', async () => {
    const expectations: Array<[string[], string, string]> = [
      [['preview', 'latest'], 'Unexpected argument for preview: latest', 'Did you mean: agentfeed preview --latest'],
      [['publish', 'latest', 'yes'], 'Unexpected argument for publish: latest', 'Did you mean: agentfeed publish --latest --yes'],
      [['discard', 'latest', 'yes'], 'Unexpected argument for discard: latest', 'Did you mean: agentfeed discard --latest --yes'],
      [['scan', 'latest', 'dry-run'], 'Unexpected argument for scan: latest', 'Did you mean: agentfeed scan --latest --dry-run'],
      [['share', 'yes', 'open-review'], 'Unexpected argument for share: yes', 'Did you mean: agentfeed share --yes --open-review'],
      [['collect', 'explain'], 'Unexpected argument for collect: explain', 'Did you mean: agentfeed collect --explain'],
    ];

    for (const [args, message, suggestion] of expectations) {
      const failure = await runCliFailure(args);
      expect(failure.stderr).toContain(message);
      expect(failure.stderr).toContain(suggestion);
      expect(failure.stderr).toContain(`Run: agentfeed ${args[0]} --help`);
      expect(failure.stdout).toBe('');
    }
  });

  it('rejects collect when --source is missing a value', async () => {
    const failure = await runCliFailure(['collect', '--source']);

    expect(failure.stderr).toContain('--source requires a value');
    expect(failure.stderr).toContain('Run: agentfeed collect --help');
    expect(failure.stdout).toBe('');
  });

  it('rejects login when --api-base-url is missing a value', async () => {
    const failure = await runCliFailure(['login', '--api-base-url']);

    expect(failure.stderr).toContain('--api-base-url requires a value');
    expect(failure.stderr).toContain('Run: agentfeed login --help');
    expect(failure.stdout).toBe('');
  });

  it('prints command help hints for unexpected positional arguments', async () => {
    const expectations: Array<[string[], string, string]> = [
      [['status', 'extra'], 'Unexpected argument for status: extra', 'Run: agentfeed status --help'],
      [['doctor', 'extra'], 'Unexpected argument for doctor: extra', 'Run: agentfeed doctor --help'],
      [['drafts', 'extra'], 'Unexpected argument for drafts: extra', 'Run: agentfeed drafts --help'],
      [['open', 'draft_123'], 'Unexpected argument for open: draft_123', 'Run: agentfeed open --help'],
      [['publish', 'draft_123'], 'Unexpected argument for publish: draft_123', 'Run: agentfeed publish --help'],
    ];

    for (const [args, message, hint] of expectations) {
      const failure = await runCliFailure(args);
      expect(failure.stderr).toContain(message);
      expect(failure.stderr).toContain(hint);
      expect(failure.stdout).toBe('');
    }
  });

  it('prints actionable recovery for token alias and completion subcommand mistakes', async () => {
    const token = await runCliFailure(['token', 'rotat']);
    expect(token.stderr).toContain('Unknown token subcommand: rotat');
    expect(token.stderr).toContain('Run: agentfeed token rotate --help');
    expect(token.stdout).toBe('');

    const tokenFlag = await runCliFailure(['token', 'rotate', 'browser']);
    expect(tokenFlag.stderr).toContain('Unexpected argument for token rotate: browser');
    expect(tokenFlag.stderr).toContain('Did you mean: agentfeed token rotate --browser');
    expect(tokenFlag.stderr).toContain('Run: agentfeed token rotate --help');
    expect(tokenFlag.stdout).toBe('');

    const completion = await runCliFailure(['completion', 'powershell']);
    expect(completion.stderr).toContain('Unsupported completion shell: powershell');
    expect(completion.stderr).toContain('Supported shells: zsh, bash, fish');
    expect(completion.stderr).toContain('Run: agentfeed completion --help');
    expect(completion.stdout).toBe('');

    const completionTypo = await runCliFailure(['completion', 'zhs']);
    expect(completionTypo.stderr).toContain('Unsupported completion shell: zhs');
    expect(completionTypo.stderr).toContain('Did you mean: agentfeed completion zsh');
    expect(completionTypo.stderr).toContain('Run: agentfeed completion --help');
    expect(completionTypo.stdout).toBe('');
  });

  it('suggests hook action and target corrections', async () => {
    const action = await runCliFailure(['hook', 'instal', 'claude-code']);
    expect(action.stderr).toContain('Unknown hook action: instal');
    expect(action.stderr).toContain('Did you mean: agentfeed hook install claude-code');
    expect(action.stderr).toContain('Usage: agentfeed hook install|uninstall claude-code');
    expect(action.stdout).toBe('');

    const target = await runCliFailure(['hook', 'install', 'claude']);
    expect(target.stderr).toContain('Only claude-code hooks are supported.');
    expect(target.stderr).toContain('Did you mean: agentfeed hook install claude-code');
    expect(target.stderr).toContain('Run: agentfeed hook install claude-code --help');
    expect(target.stdout).toBe('');
  });

  it('rejects conflicting flags with command-specific recovery hints', async () => {
    const expectations: Array<[string[], string, string]> = [
      [['share', '--dry', '--yes'], 'Conflicting options for share: --dry and --yes', 'Run: agentfeed share --help'],
      [['share', '--clipboard', '--no-clip'], 'Conflicting options for share: --clipboard and --no-clip', 'Run: agentfeed share --help'],
      [['collect', '--upload', '--no-upload'], 'Conflicting options for collect: --upload and --no-upload', 'Run: agentfeed collect --help'],
      [['preview', '--id', 'draft_123', '--latest'], 'Conflicting options for preview: --id and --latest', 'Run: agentfeed preview --help'],
      [['publish', '--id', 'draft_123', '--latest'], 'Conflicting options for publish: --id and --latest', 'Run: agentfeed publish --help'],
      [['publish', '--open-review', '--no-open-review'], 'Conflicting options for publish: --open-review and --no-open-review', 'Run: agentfeed publish --help'],
      [['scan', '--path', '.', '--latest'], 'Conflicting options for scan: --latest and --path', 'Run: agentfeed scan --help'],
      [['hook', 'install', 'claude-code', '--global', '--project'], 'Conflicting options for hook: --global and --project', 'Run: agentfeed hook --help'],
      [['discard', '--id', 'draft_123', '--latest'], 'Conflicting options for discard: --id and --latest', 'Run: agentfeed discard --help'],
      [['open', '--id', 'draft_123', '--latest'], 'Conflicting options for open: --id and --latest', 'Run: agentfeed open --help'],
    ];

    for (const [args, message, hint] of expectations) {
      const failure = await runCliFailure(args);
      expect(failure.stderr).toContain(message);
      expect(failure.stderr).toContain('Use only one of');
      expect(failure.stderr).toContain(hint);
      expect(failure.stdout).toBe('');
    }
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
    expect(stdout).toContain('completion) compadd -- zsh bash fish --help');
    expect(stderr).toBe('');
  });

  it('prints a bash completion script for completion bash', async () => {
    const { stdout, stderr } = await runCli(['completion', 'bash']);

    expect(stdout).toContain('_agentfeed()');
    expect(stdout).toContain('complete -F _agentfeed agentfeed');
    expect(stdout).toContain('completion) options="zsh bash fish --help"');
    expect(stderr).toBe('');
  });

  it('prints a fish completion script for completion fish', async () => {
    const { stdout, stderr } = await runCli(['completion', 'fish']);

    expect(stdout).toContain('complete -c agentfeed');
    expect(stdout).toContain('completion');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from completion" -a "zsh bash fish"');
    expect(stderr).toBe('');
  });
});
