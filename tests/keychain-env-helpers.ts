import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, expect, vi } from 'vitest';

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
        setImmediate(() => {
          const commandText = args.join(' ');
          if ((command === 'powershell.exe' || command === 'powershell' || command === 'pwsh') && commandText.includes('ProtectedData]::Protect')) {
            child.stdout.emit('data', 'base64-dpapi-protected-secret\n');
          }
          if ((command === 'powershell.exe' || command === 'powershell' || command === 'pwsh') && commandText.includes('ProtectedData]::Unprotect')) {
            child.stdout.emit('data', 'af_live_from_windows_dpapi\r\n');
          }
          child.emit('close', 0);
        });
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

export type KeychainEnvFixture = {
  readonly home: () => string;
};

export function useKeychainEnvFixture(): KeychainEnvFixture {
  let home = '';

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

  return { home: () => home };
}

export function setSensitiveEnvironment(): void {
  process.env.AGENTFEED_TOKEN = 'af_live_env_secret_should_not_reach_keychain_helpers';
  process.env.AWS_SECRET_ACCESS_KEY = 'aws_secret_should_not_reach_keychain_helpers';
  process.env.NPM_TOKEN = 'npm_secret_should_not_reach_keychain_helpers';
  process.env.MY_CUSTOM_SECRET = 'custom_secret_should_not_reach_keychain_helpers';
  process.env.SSH_AUTH_SOCK = '/tmp/ssh-agent-secret.sock';
  process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST = 'AGENTFEED_TOKEN,NPM_TOKEN,AWS_SECRET_ACCESS_KEY,MY_CUSTOM_SECRET,SSH_AUTH_SOCK';
}

export function expectScrubbed(env: NodeJS.ProcessEnv | undefined): void {
  expect(env).toBeTruthy();
  expect(env?.AGENTFEED_TOKEN).toBeUndefined();
  expect(env?.AWS_SECRET_ACCESS_KEY).toBeUndefined();
  expect(env?.NPM_TOKEN).toBeUndefined();
  expect(env?.MY_CUSTOM_SECRET).toBeUndefined();
  expect(env?.SSH_AUTH_SOCK).toBeUndefined();
  expect(env?.PATH).toBe(process.env.PATH);
}

export { childProcessMock, deleteSavedCredentials, loadCredentialsWithMetadata, platformMock, saveCredentials };
