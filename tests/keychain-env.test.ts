import { describe, expect, it } from 'vitest';
import {
  childProcessMock,
  deleteSavedCredentials,
  expectScrubbed,
  loadCredentialsWithMetadata,
  platformMock,
  saveCredentials,
  setSensitiveEnvironment,
  useKeychainEnvFixture,
} from './keychain-env-helpers.js';

const fixture = useKeychainEnvFixture();

describe('native keychain helper environments', () => {
  it('passes macOS security password with -w argument because security does not read it from stdin', async () => {
    setSensitiveEnvironment();

    await saveCredentials('af_live_saved_to_security', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
    });
    const deleted = await deleteSavedCredentials();

    expect(deleted.keychain_deleted).toBe(true);
    expect(childProcessMock.execFileCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['security', '-h'],
      ['security', '-h'],
      ['security', 'delete-generic-password'],
    ]);
    expect(childProcessMock.spawnCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['security', 'add-generic-password'],
    ]);
    expect(childProcessMock.spawnCalls[0].input).toBe('');
    expect(childProcessMock.spawnCalls[0].args.at(-2)).toBe('-w');
    expect(childProcessMock.spawnCalls[0].args.at(-1)).toBe('af_live_saved_to_security');
    for (const call of childProcessMock.spawnCalls) expectScrubbed(call.options?.env);
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
    const loaded = await loadCredentialsWithMetadata({ cwd: fixture.home() });
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
