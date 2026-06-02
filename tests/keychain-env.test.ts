import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const childProcessMock = vi.hoisted(() => {
  const execFileCalls: Array<{ command: string; args: string[]; options?: { env?: NodeJS.ProcessEnv } }> = [];
  const spawnCalls: Array<{ command: string; args: string[]; options?: { env?: NodeJS.ProcessEnv }; input?: string }> = [];

  const execFileMock = vi.fn() as unknown as ReturnType<typeof vi.fn> & {
    [key: symbol]: ReturnType<typeof vi.fn>;
  };
  execFileMock[Symbol.for('nodejs.util.promisify.custom')] = vi.fn(async (command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }) => {
    execFileCalls.push({ command, args, options });
    if (command === 'security' && args[0] === 'find-generic-password') {
      return { stdout: 'af_live_from_security\n', stderr: '' };
    }
    if (command === 'secret-tool' && args[0] === 'lookup') {
      return { stdout: 'af_live_from_secret_tool\n', stderr: '' };
    }
    return { stdout: '', stderr: '' };
  });

  const spawnMock = vi.fn((command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }) => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
      stderr: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
      stdin: { end: ReturnType<typeof vi.fn> };
      kill: ReturnType<typeof vi.fn>;
    };
    const call = { command, args, options, input: undefined as string | undefined };
    spawnCalls.push(call);
    child.stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
    child.stdin = {
      end: vi.fn((input?: string) => {
        call.input = input;
        setImmediate(() => child.emit('close', 0));
      })
    };
    child.kill = vi.fn();
    return child;
  });

  return { execFileMock, spawnMock, execFileCalls, spawnCalls };
});

const platformMock = vi.hoisted(() => vi.fn(() => 'darwin'));

vi.mock('node:child_process', () => ({
  execFile: childProcessMock.execFileMock,
  spawn: childProcessMock.spawnMock,
}));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, platform: platformMock };
});

const { saveCredentials, loadCredentialsWithMetadata, deleteSavedCredentials } = await import('../src/config/credentials.js');

let home: string;
const oldEnv: Record<string, string | undefined> = {};
const envNames = [
  'HOME',
  'AGENTFEED_HOME',
  'AGENTFEED_TOKEN',
  'AGENTFEED_CREDENTIAL_STORE',
  'AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST',
  'AWS_SECRET_ACCESS_KEY',
  'NPM_TOKEN',
  'MY_CUSTOM_SECRET',
  'SSH_AUTH_SOCK',
  'PATH',
];

function setSensitiveEnvironment() {
  process.env.AGENTFEED_TOKEN = 'af_live_env_secret_should_not_reach_keychain_helpers';
  process.env.AWS_SECRET_ACCESS_KEY = 'aws_secret_should_not_reach_keychain_helpers';
  process.env.NPM_TOKEN = 'npm_secret_should_not_reach_keychain_helpers';
  process.env.MY_CUSTOM_SECRET = 'custom_secret_should_not_reach_keychain_helpers';
  process.env.SSH_AUTH_SOCK = '/tmp/ssh-agent-secret.sock';
  process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST = 'AGENTFEED_TOKEN,NPM_TOKEN,AWS_SECRET_ACCESS_KEY,MY_CUSTOM_SECRET,SSH_AUTH_SOCK';
}

function expectScrubbed(env: NodeJS.ProcessEnv | undefined) {
  expect(env).toBeTruthy();
  expect(env?.AGENTFEED_TOKEN).toBeUndefined();
  expect(env?.AWS_SECRET_ACCESS_KEY).toBeUndefined();
  expect(env?.NPM_TOKEN).toBeUndefined();
  expect(env?.MY_CUSTOM_SECRET).toBeUndefined();
  expect(env?.SSH_AUTH_SOCK).toBeUndefined();
  expect(env?.PATH).toBe(process.env.PATH);
}

describe('native keychain helper environments', () => {
  beforeEach(async () => {
    for (const name of envNames) oldEnv[name] = process.env[name];
    home = await mkdtemp(join(tmpdir(), 'agentfeed-keychain-env-home-'));
    process.env.HOME = home;
    delete process.env.AGENTFEED_HOME;
    delete process.env.AGENTFEED_CREDENTIAL_STORE;
    childProcessMock.execFileCalls.length = 0;
    childProcessMock.spawnCalls.length = 0;
    childProcessMock.execFileMock.mockClear();
    childProcessMock.spawnMock.mockClear();
    childProcessMock.execFileMock[Symbol.for('nodejs.util.promisify.custom')].mockClear();
    platformMock.mockReturnValue('darwin');
  });

  afterEach(async () => {
    for (const name of envNames) {
      if (oldEnv[name] === undefined) delete process.env[name];
      else process.env[name] = oldEnv[name];
    }
    await rm(home, { recursive: true, force: true });
  });

  it('scrubs sensitive environment variables from macOS security helper execs', async () => {
    setSensitiveEnvironment();

    await saveCredentials('af_live_saved_to_security', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
    });
    const deleted = await deleteSavedCredentials();

    expect(deleted.keychain_deleted).toBe(true);
    expect(childProcessMock.execFileCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['security', '-h'],
      ['security', 'add-generic-password'],
      ['security', '-h'],
      ['security', 'delete-generic-password'],
    ]);
    for (const call of childProcessMock.execFileCalls) expectScrubbed(call.options?.env);
  });

  it('scrubs sensitive environment variables from Linux secret-tool execs and stdin store spawns', async () => {
    platformMock.mockReturnValue('linux');
    setSensitiveEnvironment();

    await saveCredentials('af_live_saved_to_secret_tool', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
    });
    delete process.env.AGENTFEED_TOKEN;
    const loaded = await loadCredentialsWithMetadata({ cwd: home });
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret_should_not_reach_keychain_helpers';
    const deleted = await deleteSavedCredentials();

    expect(loaded.token_source).toBe('keychain');
    expect(deleted.keychain_deleted).toBe(true);
    expect(childProcessMock.spawnCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['secret-tool', 'store'],
    ]);
    expect(childProcessMock.spawnCalls[0].input).toBe('af_live_saved_to_secret_tool');
    for (const call of childProcessMock.spawnCalls) expectScrubbed(call.options?.env);
    for (const call of childProcessMock.execFileCalls) expectScrubbed(call.options?.env);
    expect(childProcessMock.execFileCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['secret-tool', '--version'],
      ['secret-tool', '--version'],
      ['secret-tool', 'lookup'],
      ['secret-tool', '--version'],
      ['secret-tool', 'clear'],
    ]);
  });
});
