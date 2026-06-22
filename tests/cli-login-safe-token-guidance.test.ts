import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CliFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

function stringProperty(value: object, key: 'stdout' | 'stderr'): string | undefined {
  if (!(key in value)) return undefined;
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function cliFailure(error: unknown): CliFailure {
  if (typeof error !== 'object' || error === null) return {};
  const stdout = stringProperty(error, 'stdout');
  const stderr = stringProperty(error, 'stderr');
  return {
    ...(stdout === undefined ? {} : { stdout }),
    ...(stderr === undefined ? {} : { stderr })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  return isRecord(parsed) ? parsed : {};
}

function objectField(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const field = value[key];
  return isRecord(field) ? field : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function stringArrayField(value: Record<string, unknown>, key: string): string[] {
  const field = value[key];
  if (!Array.isArray(field)) return [];
  return field.filter((item): item is string => typeof item === 'string');
}

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-login-safe-token-guidance-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('login safe-token guidance output', () => {
  it('login --json refuses browser auth so stdout stays parseable', async () => {
    let failure: CliFailure | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'login', '--json', '--no-open'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: '',
          AGENTFEED_CI: '1'
        }
      });
    } catch (error) {
      failure = cliFailure(error);
    }

    const output = parseJsonObject(failure?.stdout ?? '{}');
    const error = objectField(output, 'error');
    expect(stringField(error, 'message')).toContain('login --json requires token input');
    expect(stringArrayField(output, 'next_actions')).toEqual([
      'printf %s "$TOKEN" | agentfeed login --token-stdin --json',
      'printf %s "$TOKEN" | agentfeed login --token - --json --no-save'
    ]);
    expect(failure?.stderr ?? '').toBe('');
    expect(failure?.stdout ?? '').not.toContain('AgentFeed browser authorization');
  });

  it('does not advertise literal argv token login in help output', () => {
    const stdout = execFileSync(process.execPath, [cliPath, '--help'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('agentfeed login --token-stdin');
    expect(stdout).toContain('agentfeed logout');
    expect(stdout).toContain('agentfeed login --token - --no-save');
    expect(stdout).not.toContain('agentfeed login --token <token>');
  });


  it('rejects literal argv token login by default before saving credentials', async () => {
    const token = 'af_live_argv_should_not_be_accepted';

    let failure: CliFailure | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'login', '--token', token, '--api-base-url', 'http://127.0.0.1:9/v1'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN: '',
          AGENTFEED_CREDENTIAL_STORE: 'file'
        }
      });
    } catch (error) {
      failure = cliFailure(error);
    }

    expect(failure?.stderr).toContain('Literal token input through --token <token> is disabled');
    expect(failure?.stderr).toContain('Reason: argv can leak through shell history and process listings.');
    expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
    expect(failure?.stderr).toContain('Run: agentfeed login');
    expect(failure?.stderr).toContain('AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1 agentfeed login --token <token>');
    expect(failure?.stderr).not.toContain(token);
    expect(failure?.stdout ?? '').toBe('');
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

});
