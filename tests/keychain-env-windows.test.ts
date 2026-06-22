import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

describe('native keychain Windows DPAPI environments', () => {
  it('uses Windows DPAPI-backed native storage for auto save/load/delete without plaintext file leakage', async () => {
    platformMock.mockReturnValue('win32');
    setSensitiveEnvironment();

    await saveCredentials('af_live_saved_to_windows_dpapi', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'auto',
    });

    const metadataFile = await readFile(join(fixture.home(), '.agentfeed', 'credentials.json'), 'utf8');
    const metadata = JSON.parse(metadataFile) as { keychain_account: string };
    const encryptedSecretPath = join(fixture.home(), '.agentfeed', `${metadata.keychain_account}.dpapi`);
    const encryptedSecretFile = await readFile(encryptedSecretPath, 'utf8');
    expect(metadataFile).toContain('"credential_store": "keychain"');
    expect(metadataFile).not.toContain('af_live_saved_to_windows_dpapi');
    expect(encryptedSecretFile).toContain('base64-dpapi-protected-secret');
    expect(encryptedSecretFile).not.toContain('af_live_saved_to_windows_dpapi');

    delete process.env.AGENTFEED_TOKEN;
    const loaded = await loadCredentialsWithMetadata({ cwd: fixture.home() });
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret_should_not_reach_keychain_helpers';
    const deleted = await deleteSavedCredentials();

    expect(loaded.token_source).toBe('keychain');
    expect(loaded.credential_store).toBe('keychain');
    expect(loaded.credentials?.ingestion_token).toBe('af_live_from_windows_dpapi');
    expect(deleted.keychain_deleted).toBe(true);
    await expect(readFile(encryptedSecretPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    expect(childProcessMock.spawnCalls.map((call) => call.command)).toEqual([
      'powershell.exe',
      'powershell.exe',
    ]);
    expect(childProcessMock.spawnCalls[0].input).toBe('af_live_saved_to_windows_dpapi');
    expect(childProcessMock.spawnCalls[1].input).toContain('base64-dpapi-protected-secret');
    for (const call of childProcessMock.spawnCalls) {
      expectScrubbed(call.options?.env);
      expect(JSON.stringify(call.args)).not.toContain('af_live_saved_to_windows_dpapi');
      expect(JSON.stringify(call.args)).toContain('Add-Type -AssemblyName System.Security');
      expect(JSON.stringify(call.args)).not.toContain('ConvertTo-SecureString');
      expect(JSON.stringify(call.args)).not.toContain('ConvertFrom-SecureString');
    }
    for (const call of childProcessMock.execFileCalls) expectScrubbed(call.options?.env);
    expect(childProcessMock.execFileCalls.map((call) => [call.command, call.args[0]])).toEqual([
      ['powershell.exe', '-NoProfile'],
      ['powershell.exe', '-NoProfile'],
      ['powershell.exe', '-NoProfile'],
      ['powershell.exe', '-NoProfile'],
      ['powershell.exe', '-NoProfile'],
    ]);
  });
});
