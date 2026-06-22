import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { credentialsPath, deleteSavedCredentials, globalAgentFeedDir, loadCredentialsWithMetadata, saveCredentials } from '../src/config/credentials.js';
import { pathExists } from '../src/utils/fs.js';
import {
  mutableSecretStore,
  useKeychainStorageFixture,
} from './config-keychain-storage-helpers.js';

const fixture = useKeychainStorageFixture();

describe('keychain credential storage config', () => {
  it('removes keychain metadata and asks the injected keychain backend to delete the secret', async () => {
    const keychain = mutableSecretStore('logout-account');

    await saveCredentials('af_live_logout_keychain_secret', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
      secretStore: keychain.store,
    });

    const result = await deleteSavedCredentials({ secretStore: keychain.store });

    expect(result.credentials_file_deleted).toBe(true);
    expect(result.keychain_deleted).toBe(true);
    expect(keychain.deleteCalled()).toBe(true);
    expect(keychain.savedSecret()).toBeNull();
    expect(JSON.stringify(result)).not.toContain('af_live_logout_keychain_secret');
    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('can round-trip credentials through the native macOS keychain when explicitly enabled', async () => {
    if (process.platform !== 'darwin' || process.env.CI || process.env.AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS !== '1') return;

    let metadata: { keychain_account?: string; keychain_service?: string } | null = null;
    const token = 'af_live_keychain_native_smoke';
    const hostHome = fixture.hostHome();
    if (hostHome) process.env.HOME = hostHome;
    process.env.AGENTFEED_HOME = fixture.home();
    try {
      await saveCredentials(token, {
        apiBaseUrl: 'http://localhost:8001/v1',
        credentialStore: 'keychain',
      });

      metadata = JSON.parse(await readFile(credentialsPath(), 'utf8'));
      expect(metadata?.keychain_account).toBeTruthy();
      expect(metadata?.keychain_service).toBe('AgentFeed CLI');
      expect(JSON.stringify(metadata)).not.toContain(token);

      const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });
      expect(resolved.token_source).toBe('keychain');
      expect(resolved.credential_store).toBe('keychain');
      expect(resolved.credentials?.ingestion_token).toBe(token);
    } finally {
      if (metadata?.keychain_account && metadata.keychain_service) {
        try {
          execFileSync('security', ['delete-generic-password', '-a', metadata.keychain_account, '-s', metadata.keychain_service], { stdio: 'ignore' });
        } catch {
          // The smoke credential may not have been created if the keychain write failed.
        }
      }
    }
  }, 20_000);

  it('can round-trip credentials through native Windows DPAPI when explicitly enabled', async () => {
    if (process.platform !== 'win32' || process.env.AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS !== '1') return;

    let metadata: { keychain_account?: string; keychain_service?: string } | null = null;
    const token = 'af_live_windows_dpapi_native_smoke';
    process.env.AGENTFEED_HOME = fixture.home();
    try {
      await saveCredentials(token, {
        apiBaseUrl: 'http://localhost:8001/v1',
        credentialStore: 'keychain',
      });

      const metadataFile = await readFile(credentialsPath(), 'utf8');
      metadata = JSON.parse(metadataFile);
      expect(metadata?.keychain_account).toBeTruthy();
      expect(metadata?.keychain_service).toBe('AgentFeed CLI');
      expect(metadataFile).not.toContain(token);

      const encryptedSecretPath = join(globalAgentFeedDir(), `${metadata?.keychain_account}.dpapi`);
      const encryptedSecretFile = await readFile(encryptedSecretPath, 'utf8');
      expect(encryptedSecretFile.trim()).toBeTruthy();
      expect(encryptedSecretFile).not.toContain(token);

      const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });
      expect(resolved.token_source).toBe('keychain');
      expect(resolved.credential_store).toBe('keychain');
      expect(resolved.credentials?.ingestion_token).toBe(token);
    } finally {
      await deleteSavedCredentials().catch(() => undefined);
    }
  }, 20_000);

  it('can store the token in an injected keychain backend without plaintext credential-file leakage', async () => {
    const keychain = mutableSecretStore('test-account');

    await saveCredentials('af_live_keychain_secret', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
      secretStore: keychain.store,
    });

    const metadataFile = await readFile(credentialsPath(), 'utf8');
    expect(metadataFile).toContain('"credential_store": "keychain"');
    expect(metadataFile).not.toContain('af_live_keychain_secret');

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir(), secretStore: keychain.store });
    expect(resolved.token_source).toBe('keychain');
    expect(resolved.credential_store).toBe('keychain');
    expect(resolved.credentials).toMatchObject({
      api_base_url: 'http://localhost:8001/v1',
      ingestion_token: 'af_live_keychain_secret'
    });
  });
});
