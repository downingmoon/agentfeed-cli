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

interface CliFailure extends Error {
  readonly stdout?: unknown;
  readonly stderr?: unknown;
}

interface JsonErrorOutput {
  readonly error: {
    readonly code?: string;
    readonly message: string;
    readonly details: readonly string[];
  };
  readonly next_actions: readonly string[];
  readonly suggestions?: readonly string[];
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-help-recovery-'));
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

function isCliFailure(error: unknown): error is CliFailure {
  return error instanceof Error;
}

function optionalText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function runCliFailure(args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    await runCli(args);
  } catch (error) {
    if (isCliFailure(error)) {
      return { stdout: optionalText(error.stdout), stderr: optionalText(error.stderr) };
    }
    throw error;
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

describe('CLI help option validation and recovery', () => {
  it('rejects unknown options before running a command', async () => {
    const failure = await runCliFailure(['status', '--bogus']);

    expect(failure.stderr).toContain('Unknown option: --bogus');
    expect(failure.stderr).toContain('Run: agentfeed status --help');
    expect(failure.stdout).toBe('');
  });

  it('prints structured JSON errors when --json commands fail before running', async () => {
    const failure = await runCliFailure(['status', '--bogus', '--json']);
    const output: JsonErrorOutput = JSON.parse(failure.stdout);

    expect(failure.stderr).toBe('');
    expect(output.error.message).toBe('Unknown option: --bogus');
    expect(output.error.code).toContain('unknown_option_bogus');
    expect(output.next_actions).toEqual(['agentfeed status --help']);
    expect(output.suggestions).toEqual([]);
  });


  it('suggests concrete workflows when a global-looking option is missing its command', async () => {
    const dry = await runCliFailure(['--dry']);
    expect(dry.stderr).toContain('Option appears before command: --dry');
    expect(dry.stderr).toContain('Try: agentfeed share --dry');
    expect(dry.stderr).toContain('Try: agentfeed collect --dry-run --explain');
    expect(dry.stderr).toContain('Run: agentfeed --help');
    expect(dry.stdout).toBe('');

    const json = await runCliFailure(['--json']);
    const jsonOutput: JsonErrorOutput = JSON.parse(json.stdout);
    expect(json.stderr).toBe('');
    expect(jsonOutput.error.message).toContain('Option appears before command: --json');
    expect(jsonOutput.next_actions).toEqual(expect.arrayContaining([
      'agentfeed status --json',
      'agentfeed commands --json',
      'agentfeed --help'
    ]));

    const apiBase = await runCliFailure(['--api-base-url', 'http://localhost:8001/v1']);
    expect(apiBase.stderr).toContain('Option appears before command: --api-base-url');
    expect(apiBase.stderr).toContain('Try: agentfeed login --api-base-url http://localhost:8001/v1');
    expect(apiBase.stdout).toBe('');
  });

  it('explains command-first syntax when options are placed before the command', async () => {
    const json = await runCliFailure(['--json', 'status']);
    const jsonOutput: JsonErrorOutput = JSON.parse(json.stdout);
    expect(json.stderr).toBe('');
    expect(jsonOutput.error.message).toContain('Option appears before command: --json');
    expect(jsonOutput.error.details.join('\n')).toContain('AgentFeed uses command-first syntax: agentfeed <command> [options].');
    expect(jsonOutput.next_actions).toEqual(['agentfeed status --json', 'agentfeed status --help']);
    expect(json.stdout).not.toContain('Unknown command: --json');

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

  it('suggests help topics and the help command for close typos', async () => {
    const topic = await runCliFailure(['help', 'statsu']);
    expect(topic.stderr).toContain('Unknown help topic: statsu');
    expect(topic.stderr).toContain('Did you mean: agentfeed help status');
    expect(topic.stderr).toContain('Run: agentfeed help');
    expect(topic.stdout).toBe('');

    const command = await runCliFailure(['hlp']);
    expect(command.stderr).toContain('Unknown command: hlp');
    expect(command.stderr).toContain('Did you mean: agentfeed help');
    expect(command.stderr).toContain('Run: agentfeed --help');
    expect(command.stdout).toBe('');
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

    expect(failure.stderr).toContain('Usage: agentfeed hook uninstall claude-code');
    expect(failure.stderr).toContain('Claude Code hook install is deprecated.');
    expect(failure.stderr).toContain('Run: agentfeed hook --help');
    expect(failure.stdout).toBe('');
  });

  it('prints supported hook target guidance for unsupported hook targets', async () => {
    const failure = await runCliFailure(['hook', 'uninstall', 'cursor']);

    expect(failure.stderr).toContain('Only legacy claude-code hook cleanup is supported.');
    expect(failure.stderr).toContain('Run: agentfeed hook uninstall claude-code --help');
    expect(failure.stdout).toBe('');
  });
});
