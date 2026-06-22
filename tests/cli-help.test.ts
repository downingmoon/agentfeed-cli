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
    expect(stdout).toContain('Omit --source to auto-detect Claude/Codex/Cursor/Gemini sessions and plugins.');
    expect(stdout).toContain('Override source (auto-detect is default)');
    expect(stdout).toContain('Values: claude-code, codex, cursor, gemini-cli, other');
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

  it('prints command catalog through commands command and JSON output', async () => {
    const human = await runCli(['commands']);
    expect(human.stderr).toBe('');
    expect(human.stdout).toContain('AgentFeed commands');
    expect(human.stdout).toContain('Start:');
    expect(human.stdout).toContain('commands');
    expect(human.stdout).toContain('List available AgentFeed commands');
    expect(human.stdout).toContain('Guided workflows:');
    expect(human.stdout).toContain('Beginner setup: Connect one project and confirm the CLI is ready.');
    expect(human.stdout).toContain('agentfeed init');
    expect(human.stdout).toContain('Daily share:');
    expect(human.stdout).toContain('agentfeed share --yes --open-review');
    expect(human.stdout).toContain('Draft review: Inspect pending drafts and publish the one you trust.');
    expect(human.stdout).toContain('Power user: Control source, window, and evidence before publishing.');
    expect(human.stdout).toContain('Recovery: Diagnose setup, token, API, or agent-detection problems.');
    expect(human.stdout).toContain('Try this:');
    expect(human.stdout).toContain('Recommended order:');
    expect(human.stdout).toContain('  1. agentfeed init');
    expect(human.stdout).toContain('  2. agentfeed login');
    expect(human.stdout).toContain('agentfeed share --dry');
    expect(human.stdout).toContain('Run agentfeed help <command>');

    const json = await runCli(['commands', '--json']);
    const parsed = JSON.parse(json.stdout) as {
      next_actions?: string[];
      workflows?: Array<{ name: string; description: string; commands: string[] }>;
      commands: Array<{
        group: string;
        commands: Array<{
          name: string;
          description: string;
          usage?: string;
          help_command?: string;
          example_command?: string;
          options?: {
            flags?: string[];
            value_options?: string[];
            option_details?: Array<{ name: string; description: string; requires_value: boolean; value_hint?: string; value_choices?: string[] }>;
            conflicts?: Array<[string, string]>;
            completion_words?: string[];
          };
        }>;
      }>;
    };
    const flatCommands = parsed.commands.flatMap((group) => group.commands);
    const share = flatCommands.find((command) => command.name === 'share');
    const commands = flatCommands.find((command) => command.name === 'commands');
    const completion = flatCommands.find((command) => command.name === 'completion');

    expect(json.stderr).toBe('');
    expect(parsed.next_actions).toEqual(['agentfeed init', 'agentfeed login', 'agentfeed share --dry']);
    expect(parsed.workflows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Beginner setup', description: 'Connect one project and confirm the CLI is ready.', commands: ['agentfeed init', 'agentfeed login', 'agentfeed status'] }),
      expect.objectContaining({ name: 'Daily share', description: 'Preview work first, then upload and open the private review.', commands: expect.arrayContaining(['agentfeed share --dry', 'agentfeed share --yes --open-review']) }),
      expect.objectContaining({ name: 'Power user', commands: expect.arrayContaining(['agentfeed collect --source codex --all']) }),
      expect.objectContaining({ name: 'Recovery', commands: expect.arrayContaining(['agentfeed doctor', 'agentfeed status']) })
    ]));
    expect(parsed.commands.some((group) => group.group === 'Start')).toBe(true);
    expect(share).toMatchObject({
      description: 'Collect, preview, and optionally upload in one workflow',
      usage: 'agentfeed share [options]',
      help_command: 'agentfeed help share',
      example_command: 'agentfeed share --dry'
    });
    expect(share?.options).toMatchObject({
      flags: expect.arrayContaining(['--dry', '--yes', '--json', '--clipboard', '--open-review', '--no-save-cursor']),
      value_options: expect.arrayContaining(['--source', '--session-file', '--note']),
      option_details: expect.arrayContaining([
        expect.objectContaining({ name: '--source', description: 'Select agent source', requires_value: true, value_hint: 'source', value_choices: ['claude-code', 'codex', 'cursor', 'gemini-cli', 'other'] }),
        expect.objectContaining({ name: '--no-save-cursor', description: 'Do not advance the collection cursor', requires_value: false })
      ]),
      conflicts: expect.arrayContaining([['--dry', '--yes'], ['--clipboard', '--no-clipboard']]),
      completion_words: expect.arrayContaining(['--dry', '--json', '--note', '--source', '--help'])
    });
    expect(commands).toMatchObject({
      help_command: 'agentfeed help commands',
      example_command: 'agentfeed commands'
    });
    expect(commands?.options).toMatchObject({
      flags: ['--json'],
      value_options: [],
      conflicts: [],
      completion_words: ['--help', '--json']
    });
    expect(completion).toMatchObject({
      usage: 'agentfeed completion <shell>',
      options: {
        completion_words: expect.arrayContaining(['zsh', 'bash', 'fish', '--help'])
      }
    });
    expect(json.stdout).not.toMatch(/^AgentFeed commands$/m);
    expect(json.stdout).not.toMatch(/(^|\n)Run agentfeed help/);
  });

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

  it('prints completion-specific help for completion --help', async () => {
    const { stdout, stderr } = await runCli(['completion', '--help']);

    expect(stdout).toContain('Usage: agentfeed completion <shell>');
    expect(stdout).toContain('zsh');
    expect(stdout).toContain('bash');
    expect(stdout).toContain('fish');
    expect(stdout).toContain('Install:');
    expect(stdout).toContain('agentfeed completion zsh > _agentfeed');
    expect(stdout).toContain('agentfeed completion bash > agentfeed.bash');
    expect(stdout).toContain('agentfeed completion fish > agentfeed.fish');
    expect(stdout).toContain('Move the generated file into your shell completion directory.');
    expect(stdout).toContain('Restart your shell after installing completions.');
    expect(stderr).toBe('');
  });

  it('prints a zsh completion script for completion zsh', async () => {
    const { stdout, stderr } = await runCli(['completion', 'zsh']);

    expect(stdout).toContain('#compdef agentfeed');
    expect(stdout).toContain('_agentfeed');
    expect(stdout).toContain('agentfeed');
    expect(stdout).toContain('completion) compadd -- zsh bash fish --help');
    expect(stdout).toContain('help) compadd -- help commands init login');
    expect(stdout).toContain('completion token --help');
    expect(stdout).toContain('_arguments');
    expect(stdout).toContain("'--json[Print machine-readable login status]'");
    expect(stdout).toContain("'--api-base-url[Override AgentFeed API base URL]:API URL:'");
    expect(stdout).toContain("'--source[Select agent source]:source:(claude-code codex cursor gemini-cli other)'");
    expect(stdout).toContain("'--session-file[Read agent session metadata from a file]:path:_files'");
    expect(stdout).not.toContain('_arguments \\n');
    expect(stdout).not.toContain('Option for agentfeed');
    expect(stderr).toBe('');
  });

  it('prints a bash completion script for completion bash', async () => {
    const { stdout, stderr } = await runCli(['completion', 'bash']);

    expect(stdout).toContain('_agentfeed()');
    expect(stdout).toContain('complete -F _agentfeed agentfeed');
    expect(stdout).toContain('completion) options="zsh bash fish --help"');
    expect(stdout).toContain('--source) COMPREPLY=( $(compgen -W "claude-code codex cursor gemini-cli other" -- "$cur") ); return 0 ;;');
    expect(stdout).toContain('--path|--session-file|--settings-path) COMPREPLY=( $(compgen -f -- "$cur") ); return 0 ;;');
    expect(stdout).toContain('help) options="help commands init login');
    expect(stdout).toContain('completion token --help"');
    expect(stderr).toBe('');
  });

  it('prints a fish completion script for completion fish', async () => {
    const { stdout, stderr } = await runCli(['completion', 'fish']);

    expect(stdout).toContain('complete -c agentfeed');
    expect(stdout).toContain('completion');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from completion" -a "zsh bash fish"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from help" -a "help commands init login');
    expect(stdout).toContain('completion token" -d "Help topic"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from login" -l json -d "Print machine-readable login status"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from login" -l api-base-url -r -d "Override AgentFeed API base URL"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from collect" -l source -r -a "claude-code codex cursor gemini-cli other" -d "Select agent source"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from share" -l session-file -r -F -d "Read agent session metadata from a file"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from share" -l note -r -d "Attach a public-safe author note"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from publish" -s y -d "Upload without an interactive confirmation"');
    expect(stdout).not.toContain('Option for agentfeed');
    expect(stderr).toBe('');
  });
});
