import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialsPath, deleteSavedCredentials, globalAgentFeedDir, loadCredentialsWithMetadata, saveCredentials, type SecretStore } from '../src/config/credentials.js';
import { pathExists } from '../src/utils/fs.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldAgentFeedHome = process.env.AGENTFEED_HOME;
const oldBase = process.env.AGENTFEED_API_BASE_URL;
const oldToken = process.env.AGENTFEED_TOKEN;
const oldAllowInsecure = process.env.AGENTFEED_ALLOW_INSECURE_API;
const oldAllowInsecureCredentialStore = process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
const oldTrustRepoApiBase = process.env.AGENTFEED_TRUST_REPO_API_BASE;
const oldCredentialStore = process.env.AGENTFEED_CREDENTIAL_STORE;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  delete process.env.AGENTFEED_HOME;
  delete process.env.AGENTFEED_API_BASE_URL;
  delete process.env.AGENTFEED_TOKEN;
  delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  delete process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
  delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  delete process.env.AGENTFEED_CREDENTIAL_STORE;
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedHome === undefined) delete process.env.AGENTFEED_HOME;
  else process.env.AGENTFEED_HOME = oldAgentFeedHome;
  if (oldBase === undefined) delete process.env.AGENTFEED_API_BASE_URL;
  else process.env.AGENTFEED_API_BASE_URL = oldBase;
  if (oldToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = oldToken;
  if (oldAllowInsecure === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  else process.env.AGENTFEED_ALLOW_INSECURE_API = oldAllowInsecure;
  if (oldAllowInsecureCredentialStore === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
  else process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE = oldAllowInsecureCredentialStore;
  if (oldTrustRepoApiBase === undefined) delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  else process.env.AGENTFEED_TRUST_REPO_API_BASE = oldTrustRepoApiBase;
  if (oldCredentialStore === undefined) delete process.env.AGENTFEED_CREDENTIAL_STORE;
  else process.env.AGENTFEED_CREDENTIAL_STORE = oldCredentialStore;
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('keychain credential storage config', () => {
  it('removes keychain metadata and asks the injected keychain backend to delete the secret', async () => {
    let savedSecret: string | null = null;
    let deleteCalled = false;
    const keychain: SecretStore = {
      service: 'AgentFeed CLI Test',
      account: 'logout-account',
      async isAvailable() { return true; },
      async read() { return savedSecret; },
      async write(secret: string) { savedSecret = secret; },
      async delete() { deleteCalled = true; savedSecret = null; },
    };

    await saveCredentials('af_live_logout_keychain_secret', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
      secretStore: keychain,
    });

    const result = await deleteSavedCredentials({ secretStore: keychain });

    expect(result.credentials_file_deleted).toBe(true);
    expect(result.keychain_deleted).toBe(true);
    expect(deleteCalled).toBe(true);
    expect(savedSecret).toBeNull();
    expect(JSON.stringify(result)).not.toContain('af_live_logout_keychain_secret');
    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('can round-trip credentials through the native macOS keychain when explicitly enabled', async () => {
    if (process.platform !== 'darwin' || process.env.CI || process.env.AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS !== '1') return;

    let metadata: { keychain_account?: string; keychain_service?: string } | null = null;
    const token = 'af_live_keychain_native_smoke';
    if (oldHome) process.env.HOME = oldHome;
    process.env.AGENTFEED_HOME = home;
    try {
      await saveCredentials(token, {
        apiBaseUrl: 'http://localhost:8001/v1',
        credentialStore: 'keychain',
      });

      metadata = JSON.parse(await readFile(credentialsPath(), 'utf8'));
      expect(metadata?.keychain_account).toBeTruthy();
      expect(metadata?.keychain_service).toBe('AgentFeed CLI');
      expect(JSON.stringify(metadata)).not.toContain(token);

      const resolved = await loadCredentialsWithMetadata({ cwd: dir });
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
    process.env.AGENTFEED_HOME = home;
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

      const resolved = await loadCredentialsWithMetadata({ cwd: dir });
      expect(resolved.token_source).toBe('keychain');
      expect(resolved.credential_store).toBe('keychain');
      expect(resolved.credentials?.ingestion_token).toBe(token);
    } finally {
      await deleteSavedCredentials().catch(() => undefined);
    }
  }, 20_000);

  it('can store the token in an injected keychain backend without plaintext credential-file leakage', async () => {
    let savedSecret: string | null = null;
    const keychain: SecretStore = {
      service: 'AgentFeed CLI Test',
      account: 'test-account',
      async isAvailable() { return true; },
      async read() { return savedSecret; },
      async write(secret: string) { savedSecret = secret; },
    };

    await saveCredentials('af_live_keychain_secret', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
      secretStore: keychain,
    });

    const metadataFile = await readFile(credentialsPath(), 'utf8');
    expect(metadataFile).toContain('"credential_store": "keychain"');
    expect(metadataFile).not.toContain('af_live_keychain_secret');

    const resolved = await loadCredentialsWithMetadata({ cwd: dir, secretStore: keychain });
    expect(resolved.token_source).toBe('keychain');
    expect(resolved.credential_store).toBe('keychain');
    expect(resolved.credentials).toMatchObject({
      api_base_url: 'http://localhost:8001/v1',
      ingestion_token: 'af_live_keychain_secret'
    });
  });

  it('refuses silent file fallback when auto keychain storage is unavailable', async () => {
    const unavailableKeychain: SecretStore = {
      service: 'AgentFeed CLI Test',
      account: 'unavailable',
      async isAvailable() { return false; },
      async read() { return null; },
      async write() { throw new Error('unavailable'); },
    };

    await expect(saveCredentials('af_live_file_fallback', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'auto',
      secretStore: unavailableKeychain,
    })).rejects.toThrow(/AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1/i);

    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('falls back to private file credentials only when auto fallback is explicitly allowed', async () => {
    const unavailableKeychain: SecretStore = {
      service: 'AgentFeed CLI Test',
      account: 'unavailable',
      async isAvailable() { return false; },
      async read() { return null; },
      async write() { throw new Error('unavailable'); },
    };

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

    const resolved = await loadCredentialsWithMetadata({ cwd: dir, secretStore: unavailableKeychain });
    expect(resolved.token_source).toBe('credentials_file');
    expect(resolved.credential_store).toBe('file');
    expect(resolved.warnings.join('\n')).toMatch(/keychain credential storage is not available/i);
  });

  it('refuses auto file fallback when keychain writes fail without explicit opt-in', async () => {
    const failingKeychain: SecretStore = {
      service: 'AgentFeed CLI Test',
      account: 'failing',
      async isAvailable() { return true; },
      async read() { return null; },
      async write() { throw new Error('locked keychain'); },
    };

    await expect(saveCredentials('af_live_failed_keychain_fallback', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'auto',
      secretStore: failingKeychain,
    })).rejects.toThrow(/OS keychain credential storage failed.*AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1/is);

    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('requires explicit fallback when keychain-only storage is unavailable', async () => {
    const unavailableKeychain: SecretStore = {
      service: 'AgentFeed CLI Test',
      account: 'unavailable',
      async isAvailable() { return false; },
      async read() { return null; },
      async write() { throw new Error('unavailable'); },
    };

    await expect(saveCredentials('af_live_keychain_required', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'keychain',
      secretStore: unavailableKeychain,
    })).rejects.toThrow(/OS keychain credential storage is not available/i);
  });

});
