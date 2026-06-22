import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { credentialsPath, loadCredentialsWithMetadata, saveCredentials } from '../src/config/credentials.js';
import { pathExists } from '../src/utils/fs.js';
import {
  failingSecretStore,
  unavailableSecretStore,
  useKeychainStorageFixture,
} from './config-keychain-storage-helpers.js';

const fixture = useKeychainStorageFixture();

describe('keychain credential storage fallback policy', () => {
  it('refuses silent file fallback when auto keychain storage is unavailable', async () => {
    const unavailableKeychain = unavailableSecretStore('unavailable');

    await expect(saveCredentials('af_live_file_fallback', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'auto',
      secretStore: unavailableKeychain,
    })).rejects.toThrow(/AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1/i);

    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('falls back to private file credentials only when auto fallback is explicitly allowed', async () => {
    const unavailableKeychain = unavailableSecretStore('unavailable');
    process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE = '1';

    await saveCredentials('af_live_file_fallback', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'auto',
      secretStore: unavailableKeychain,
    });

    const metadataFile = await readFile(credentialsPath(), 'utf8');
    expect(metadataFile).toContain('"credential_store": "file"');
    expect(metadataFile).toContain('credential_store_warning');
    expect(metadataFile).toContain('af_live_file_fallback');

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir(), secretStore: unavailableKeychain });
    expect(resolved.token_source).toBe('credentials_file');
    expect(resolved.credential_store).toBe('file');
    expect(resolved.warnings.join('\n')).toMatch(/keychain credential storage is not available/i);
  });

  it('refuses auto file fallback when keychain writes fail without explicit opt-in', async () => {
    const failingKeychain = failingSecretStore('failing');

    await expect(saveCredentials('af_live_failed_keychain_fallback', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'auto',
      secretStore: failingKeychain,
    })).rejects.toThrow(/OS keychain credential storage failed.*AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1/is);

    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('requires explicit fallback when keychain-only storage is unavailable', async () => {
    const unavailableKeychain = unavailableSecretStore('unavailable');

    await expect(saveCredentials('af_live_keychain_required', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
      secretStore: unavailableKeychain,
    })).rejects.toThrow(/OS keychain credential storage is not available/i);
  });
});
