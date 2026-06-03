import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, loadProjectConfig } from '../src/config/project-config.js';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata } from '../src/config/api-base.js';
import { credentialsFromToken, credentialsPath, deleteSavedCredentials, globalAgentFeedDir, loadCredentialsWithMetadata, resolveCredentials, resolveHomeDir, saveCredentials, type SecretStore } from '../src/config/credentials.js';
import { pathExists, writeJson } from '../src/utils/fs.js';

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

describe('project config', () => {
  it('init creates expected directories and valid config', async () => {
    const result = await initProject({ cwd: dir, projectName: 'My CLI', noGitCheck: true });

    expect(result.config.project.name).toBe('My CLI');
    expect(result.config.project.slug).toBe('my-cli');
    await expect(loadProjectConfig(dir)).resolves.toMatchObject({
      version: '0.2',
      project: { visibility: 'private' },
      collection: { auto_collect: true },
      privacy: { raw_diff_upload: false, raw_transcript_upload: false }
    });
    
    const other = await mkdtemp(join(tmpdir(), 'agentfeed-missing-'));
    await expect(loadProjectConfig(other)).rejects.toThrow(/AgentFeed project is not initialized/i);
    await rm(other, { recursive: true, force: true });
  });

  it('rejects malformed project config shapes with clear field-specific errors', async () => {
    await initProject({ cwd: dir, projectName: 'Shape Guard', noGitCheck: true });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const validConfig = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;

    const malformedCases: Array<{ name: string; mutate: (config: Record<string, unknown>) => unknown; expected: RegExp }> = [
      { name: 'non-object root', mutate: () => null, expected: /AgentFeed config is invalid.*root must be an object/i },
      { name: 'missing project object', mutate: (config) => ({ ...config, project: undefined }), expected: /project must be an object/i },
      { name: 'non-array tags', mutate: (config) => ({ ...config, project: { ...(config.project as Record<string, unknown>), tags: 'cli' } }), expected: /project\.tags must be an array of strings/i },
      { name: 'non-object collection settings', mutate: (config) => ({ ...config, collection: true }), expected: /collection must be an object/i },
      { name: 'non-boolean collection flag', mutate: (config) => ({ ...config, collection: { ...(config.collection as Record<string, unknown>), include_test_results: 'yes' } }), expected: /collection\.include_test_results must be a boolean/i },
      { name: 'malformed commands', mutate: (config) => ({ ...config, commands: { ...(config.commands as Record<string, unknown>), test: ['npm', 'test'] } }), expected: /commands\.test must be a string or null/i },
      { name: 'malformed agent block', mutate: (config) => ({ ...config, agents: { ...(config.agents as Record<string, unknown>), codex: true } }), expected: /agents\.codex must be an object/i },
      { name: 'malformed claude hook scope', mutate: (config) => ({ ...config, agents: { ...(config.agents as Record<string, unknown>), claude_code: { enabled: true, hook_scope: 'workspace' } } }), expected: /agents\.claude_code\.hook_scope must be "project" or "global"/i },
    ];

    for (const testCase of malformedCases) {
      await writeFile(configPath, JSON.stringify(testCase.mutate(validConfig), null, 2));
      await expect(loadProjectConfig(dir), testCase.name).rejects.toThrow(testCase.expected);
    }
  });

  it('env vars override configured credentials', async () => {
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8000/v1';
    const creds = await resolveCredentials({ ingestion_token: 'stored', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' });
    expect(creds.api_base_url).toBe('http://localhost:8000/v1');
  });

  it('builds ephemeral credentials without writing the credentials file', async () => {
    const creds = await credentialsFromToken('af_live_ephemeral', { apiBaseUrl: 'http://localhost:8001/v1/' });

    expect(creds).toMatchObject({
      api_base_url: 'http://localhost:8001/v1',
      ingestion_token: 'af_live_ephemeral'
    });
    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

  it('saves credentials with private POSIX permissions', async () => {
    if (process.platform === 'win32') return;

    await saveCredentials('af_live_private', { apiBaseUrl: 'http://localhost:8001/v1' });

    const dirMode = (await stat(globalAgentFeedDir())).mode & 0o777;
    const fileMode = (await stat(credentialsPath())).mode & 0o777;
    expect(dirMode).toBe(0o700);
    expect(fileMode).toBe(0o600);
  });

  it('removes saved file credentials without exposing token values', async () => {
    await saveCredentials('af_live_logout_file_secret', { apiBaseUrl: 'http://localhost:8001/v1', credentialStore: 'file' });

    await expect(pathExists(credentialsPath())).resolves.toBe(true);
    const result = await deleteSavedCredentials();

    expect(result).toMatchObject({
      credentials_file_deleted: true,
      keychain_deleted: null,
      warnings: []
    });
    expect(JSON.stringify(result)).not.toContain('af_live_logout_file_secret');
    await expect(pathExists(credentialsPath())).resolves.toBe(false);
  });

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

  it('writes JSON files atomically without leaving temp files behind', async () => {
    const jsonPath = join(dir, '.agentfeed', 'atomic.json');

    await writeJson(jsonPath, { value: 'first' }, { mode: 0o600 });
    await writeJson(jsonPath, { value: 'second' }, { mode: 0o600 });

    await expect(readFile(jsonPath, 'utf8')).resolves.toBe('{\n  "value": "second"\n}\n');
    const entries = await readdir(join(dir, '.agentfeed'));
    expect(entries.filter((entry) => entry.includes('atomic.json') && entry.endsWith('.tmp'))).toEqual([]);
    if (process.platform !== 'win32') {
      expect((await stat(jsonPath)).mode & 0o777).toBe(0o600);
    }
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

  it('discovers the dev orchestration .env when AGENTFEED_API_BASE_URL is not exported', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'agentfeed-workspace-'));
    const cliDir = join(workspace, 'AgentFeed-CLI');
    const devDir = join(workspace, 'agentfeed-dev');
    await mkdir(cliDir, { recursive: true });
    await mkdir(devDir, { recursive: true });
    await writeFile(join(devDir, '.env'), [
      'FRONTEND_PORT=3001',
      'AGENTFEED_API_BASE_URL=http://localhost:8001/v1',
      ''
    ].join('\n'));

    await expect(resolveApiBaseUrl({ cwd: cliDir })).resolves.toBe('http://localhost:8001/v1');

    await rm(workspace, { recursive: true, force: true });
  });

  it('keeps a stored API base URL ahead of untrusted repo-local .env discovery', async () => {
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=https://evil.example/v1\n');

    await expect(resolveApiBaseUrl({ cwd: dir, storedApiBaseUrl: 'https://api.agentfeed.dev/v1' }))
      .resolves.toBe('https://api.agentfeed.dev/v1');
  });

  it('ignores non-local API base URLs discovered from repo-local .env files', async () => {
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=https://evil.example/v1\n');

    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('https://api.agentfeed.dev/v1');
    const resolved = await resolveApiBaseUrlWithMetadata({ cwd: dir });
    expect(resolved).toMatchObject({
      value: 'https://api.agentfeed.dev/v1',
      source: 'default'
    });
    expect(resolved.warnings.join('\n')).toContain('ignored non-local AGENTFEED_API_BASE_URL');
    expect(resolved.warnings.join('\n')).toContain(join(dir, '.env'));
  });

  it('only derives local dev API URLs from safe BACKEND_PORT values', async () => {
    await writeFile(join(dir, '.env'), 'BACKEND_PORT=8001\n');
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('http://localhost:8001/v1');
    await expect(resolveApiBaseUrlWithMetadata({ cwd: dir })).resolves.toMatchObject({
      value: 'http://localhost:8001/v1',
      source: 'env_file',
      source_detail: `${join(dir, '.env')}:BACKEND_PORT`
    });

    const invalid = await mkdtemp(join(tmpdir(), 'agentfeed-bad-port-'));
    await writeFile(join(invalid, '.env'), 'BACKEND_PORT=8001/path\n');
    await expect(resolveApiBaseUrl({ cwd: invalid })).resolves.toBe('https://api.agentfeed.dev/v1');
    await rm(invalid, { recursive: true, force: true });
  });

  it('does not fall back to the project directory for global credential storage', () => {
    expect(() => resolveHomeDir({}, '')).toThrow(/safe AgentFeed home directory/i);
    expect(resolveHomeDir({ AGENTFEED_HOME: join(dir, '.agentfeed-home') }, '')).toBe(join(dir, '.agentfeed-home'));
  });

  it('rejects malformed or unsafe API base URLs before network calls', async () => {
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http//:bad' })).rejects.toThrow(/Invalid AgentFeed API base URL/i);
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'ftp://api.agentfeed.dev/v1' })).rejects.toThrow(/http or https/i);
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://evil.example/v1' })).rejects.toThrow(/http is allowed only for localhost/i);
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'https://api.agentfeed.dev/v1?debug=true' })).rejects.toThrow(/query or hash/i);
  });

  it('normalizes valid API base URLs from env and files', async () => {
    process.env.AGENTFEED_API_BASE_URL = 'https://api.agentfeed.dev/v1/';
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('https://api.agentfeed.dev/v1');

    delete process.env.AGENTFEED_API_BASE_URL;
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=\"http://localhost:8001/v1/\"\n');
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('http://localhost:8001/v1');
  });

  it('requires an explicit opt-in before accepting cleartext non-local API URLs', async () => {
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://api.internal.example/v1' })).rejects.toThrow(/AGENTFEED_ALLOW_INSECURE_API=1/);

    process.env.AGENTFEED_ALLOW_INSECURE_API = '1';
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://api.internal.example/v1/' })).resolves.toBe('http://api.internal.example/v1');
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://localhost:8001/v1' })).resolves.toBe('http://localhost:8001/v1');
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'https://custom.example/v1' })).resolves.toBe('https://custom.example/v1');
  });

  it('ignores malformed credentials files with a warning instead of crashing', async () => {
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), '{ this is not json');

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials).toBeNull();
    expect(resolved.token_source).toBe('missing');
    expect(resolved.credentials_file_exists).toBe(true);
    expect(resolved.warnings.join('\n')).toContain('ignored malformed AgentFeed credentials file');
    expect(resolved.warnings.join('\n')).toContain(credentialsPath());
  });

  it('uses environment tokens even when the credentials file is malformed', async () => {
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), '{ this is not json');
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.api_base_url).toBe('http://localhost:8001/v1');
    expect(resolved.warnings.join('\n')).toContain('ignored malformed AgentFeed credentials file');
  });


  it('ignores stored credentials fields with invalid runtime types instead of flowing them into credentials', async () => {
    delete process.env.AGENTFEED_TOKEN;
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), JSON.stringify({
      ingestion_token: 123,
      api_base_url: ['https://collector.example/v1'],
      token_expires_at: false,
      created_at: { at: 'now' },
      user: 'not-object',
      credential_store: 'file'
    }, null, 2));

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials).toBeNull();
    expect(resolved.token_source).toBe('missing');
    expect(resolved.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.warnings.join('\n')).toContain('ignored invalid AgentFeed credentials field ingestion_token');
    expect(resolved.warnings.join('\n')).toContain('ignored invalid AgentFeed credentials field api_base_url');
    expect(resolved.warnings.join('\n')).toContain(credentialsPath());
  });

  it('lets AGENTFEED_TOKEN win over invalid stored credential shapes with warnings', async () => {
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), JSON.stringify({
      ingestion_token: 123,
      api_base_url: { href: 'https://collector.example/v1' },
      created_at: 0
    }, null, 2));
    process.env.AGENTFEED_TOKEN = 'af_live_env_shape_guard';

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_shape_guard');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.credentials?.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.warnings.join('\n')).toContain('ignored invalid AgentFeed credentials field api_base_url');
  });

  it('does not combine authenticated tokens with repo-local API base discovery unless explicitly trusted', async () => {
    await writeFile(join(dir, '.env'), 'BACKEND_PORT=1234\n');
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.credentials?.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.api_base_url_source).toBe('default');
    expect(resolved.warnings.join('\n')).toContain('AGENTFEED_TRUST_REPO_API_BASE=1');
    expect(resolved.warnings.join('\n')).toContain(`${join(dir, '.env')}:BACKEND_PORT`);

    process.env.AGENTFEED_TRUST_REPO_API_BASE = '1';
    const trusted = await loadCredentialsWithMetadata({ cwd: dir });

    expect(trusted.credentials?.api_base_url).toBe('http://localhost:1234/v1');
    expect(trusted.api_base_url_source).toBe('env_file');
  });

  it('does not combine environment tokens with saved custom API bases unless explicitly configured', async () => {
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), JSON.stringify({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    }));
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.credentials?.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.api_base_url_source).toBe('default');
    expect(resolved.warnings.join('\n')).toContain('ignored saved AgentFeed API base while using AGENTFEED_TOKEN');

    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';
    const explicit = await loadCredentialsWithMetadata({ cwd: dir });

    expect(explicit.credentials?.api_base_url).toBe('http://localhost:8001/v1');
    expect(explicit.api_base_url_source).toBe('environment');
    expect(explicit.warnings.join('\n')).not.toContain('ignored saved AgentFeed API base');
  });

  it('keeps saved API bases for saved credentials when no environment token is set', async () => {
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), JSON.stringify({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    }));

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_saved_secret');
    expect(resolved.token_source).toBe('credentials_file');
    expect(resolved.credentials?.api_base_url).toBe('https://collector.example/v1');
    expect(resolved.api_base_url_source).toBe('stored_credentials');
  });

  it('resolveCredentials ignores saved API bases when AGENTFEED_TOKEN is set', async () => {
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';

    const resolved = await resolveCredentials({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    });

    expect(resolved.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.api_base_url).toBe('https://api.agentfeed.dev/v1');
  });

  it('reports credential and API base provenance without exposing token values in metadata', async () => {
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.api_base_url_source).toBe('environment');
    expect(resolved.api_base_url).toBe('http://localhost:8001/v1');
    expect(JSON.stringify({ ...resolved, credentials: undefined })).not.toContain('af_live_env_secret');

    delete process.env.AGENTFEED_TOKEN;
  });
});
