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
  it('passes macOS security password through interactive stdin instead of argv', async () => {
    setSensitiveEnvironment();

    await saveCredentials("af_live_saved_to_security'\\value", {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
    });
    const deleted = await deleteSavedCredentials();

    expect(deleted.keychain_deleted).toBe(true);
    expect(childProcessMock.execFileCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['/usr/bin/security', '-h'],
      ['/usr/bin/security', '-h'],
      ['/usr/bin/security', 'delete-generic-password'],
    ]);
    expect(childProcessMock.spawnCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['/usr/bin/security', '-i'],
    ]);
    expect(childProcessMock.spawnCalls[0].args).toEqual(['-i']);
    expect(childProcessMock.spawnCalls[0].args.join(' ')).not.toContain('af_live_saved_to_security');
    expect(childProcessMock.spawnCalls[0].input).not.toContain('af_live_saved_to_security');
    expect(childProcessMock.spawnCalls[0].input).toContain("'-X' '61665f6c6976655f73617665645f746f5f7365637572697479275c76616c7565'");
    for (const call of childProcessMock.spawnCalls) expectScrubbed(call.options?.env);
    for (const call of childProcessMock.execFileCalls) expectScrubbed(call.options?.env);
  });

  it('scrubs sensitive environment variables from Linux secret-tool execs and stdin store spawns', async () => {
    platformMock.mockReturnValue('linux');
    setSensitiveEnvironment();
    process.env.PATH = `/tmp/agentfeed-malicious-bin:${process.env.PATH ?? ''}`;

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
      ['/usr/bin/secret-tool', 'store'],
    ]);
    expect(childProcessMock.spawnCalls[0].input).toBe('af_live_saved_to_secret_tool');
    for (const call of childProcessMock.spawnCalls) expectScrubbed(call.options?.env);
    for (const call of childProcessMock.execFileCalls) expectScrubbed(call.options?.env);
    expect(childProcessMock.execFileCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['/usr/bin/secret-tool', '--version'],
      ['/usr/bin/secret-tool', '--version'],
      ['/usr/bin/secret-tool', 'lookup'],
      ['/usr/bin/secret-tool', '--version'],
      ['/usr/bin/secret-tool', 'clear'],
    ]);
  });
});
