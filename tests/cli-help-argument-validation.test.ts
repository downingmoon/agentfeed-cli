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

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-help-arguments-'));
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

describe('CLI help argument validation recovery', () => {
  it('suggests dashed flags when users type option names as arguments', async () => {
    const expectations = [
      [['preview', 'latest'], 'Unexpected argument for preview: latest', 'Did you mean: agentfeed preview --latest'],
      [['publish', 'latest', 'yes'], 'Unexpected argument for publish: latest', 'Did you mean: agentfeed publish --latest --yes'],
      [['discard', 'latest', 'yes'], 'Unexpected argument for discard: latest', 'Did you mean: agentfeed discard --latest --yes'],
      [['scan', 'latest', 'dry-run'], 'Unexpected argument for scan: latest', 'Did you mean: agentfeed scan --latest --dry-run'],
      [['share', 'yes', 'open-review'], 'Unexpected argument for share: yes', 'Did you mean: agentfeed share --yes --open-review'],
      [['collect', 'explain'], 'Unexpected argument for collect: explain', 'Did you mean: agentfeed collect --explain'],
    ] as const;

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
    const expectations = [
      [['status', 'extra'], 'Unexpected argument for status: extra', 'Run: agentfeed status --help'],
      [['doctor', 'extra'], 'Unexpected argument for doctor: extra', 'Run: agentfeed doctor --help'],
      [['drafts', 'extra'], 'Unexpected argument for drafts: extra', 'Run: agentfeed drafts --help'],
      [['open', 'draft_123'], 'Unexpected argument for open: draft_123', 'Run: agentfeed open --help'],
      [['publish', 'draft_123'], 'Unexpected argument for publish: draft_123', 'Run: agentfeed publish --help'],
    ] as const;

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

  it('rejects conflicting flags with command-specific recovery hints', async () => {
    const expectations = [
      [['share', '--dry', '--yes'], 'Conflicting options for share: --dry and --yes', 'Run: agentfeed share --help'],
      [['share', '--clipboard', '--no-clip'], 'Conflicting options for share: --clipboard and --no-clip', 'Run: agentfeed share --help'],
      [['collect', '--upload', '--no-upload'], 'Conflicting options for collect: --upload and --no-upload', 'Run: agentfeed collect --help'],
      [['preview', '--id', 'draft_123', '--latest'], 'Conflicting options for preview: --id and --latest', 'Run: agentfeed preview --help'],
      [['publish', '--id', 'draft_123', '--latest'], 'Conflicting options for publish: --id and --latest', 'Run: agentfeed publish --help'],
      [['publish', '--open-review', '--no-open-review'], 'Conflicting options for publish: --open-review and --no-open-review', 'Run: agentfeed publish --help'],
      [['scan', '--path', '.', '--latest'], 'Conflicting options for scan: --latest and --path', 'Run: agentfeed scan --help'],
      [['discard', '--id', 'draft_123', '--latest'], 'Conflicting options for discard: --id and --latest', 'Run: agentfeed discard --help'],
      [['open', '--id', 'draft_123', '--latest'], 'Conflicting options for open: --id and --latest', 'Run: agentfeed open --help'],
    ] as const;

    for (const [args, message, hint] of expectations) {
      const failure = await runCliFailure(args);
      expect(failure.stderr).toContain(message);
      expect(failure.stderr).toContain('Use only one of');
      expect(failure.stderr).toContain(hint);
      expect(failure.stdout).toBe('');
    }
  });
});
