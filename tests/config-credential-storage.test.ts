import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialsFromToken, credentialsPath, deleteSavedCredentials, globalAgentFeedDir, loadCredentialsWithMetadata, resolveCredentials, resolveHomeDir, saveCredentials } from '../src/config/credentials.js';
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

describe('credential file storage config', () => {
  it('env vars override configured credentials', async () => {
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8000/v1';
    const creds = await resolveCredentials({ ingestion_token: 'stored', api_base_url: 'https://agentfeed.api.downingmoon.dev/v1', created_at: 'now' });
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

  it('preserves GitHub avatar metadata in saved user credentials', async () => {
    await saveCredentials('af_live_avatar_metadata', {
      apiBaseUrl: 'http://localhost:8001/v1',
      credentialStore: 'file',
      user: {
        id: 'user-1',
        username: 'downingmoon',
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4',
      },
    });

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect((resolved.credentials?.user as { avatar_url?: string } | undefined)?.avatar_url)
      .toBe('https://avatars.githubusercontent.com/u/4242?v=4');
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

  it('does not fall back to the project directory for global credential storage', () => {
    expect(() => resolveHomeDir({}, '')).toThrow(/safe AgentFeed home directory/i);
    expect(resolveHomeDir({ AGENTFEED_HOME: join(dir, '.agentfeed-home') }, '')).toBe(join(dir, '.agentfeed-home'));
  });

});
