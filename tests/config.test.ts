import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, loadProjectConfig } from '../src/config/project-config.js';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata } from '../src/config/api-base.js';
import { credentialsFromToken, credentialsPath, globalAgentFeedDir, loadCredentialsWithMetadata, resolveCredentials, resolveHomeDir, saveCredentials } from '../src/config/credentials.js';
import { pathExists } from '../src/utils/fs.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldAgentFeedHome = process.env.AGENTFEED_HOME;
const oldBase = process.env.AGENTFEED_API_BASE_URL;
const oldToken = process.env.AGENTFEED_TOKEN;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  delete process.env.AGENTFEED_HOME;
  delete process.env.AGENTFEED_API_BASE_URL;
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedHome === undefined) delete process.env.AGENTFEED_HOME;
  else process.env.AGENTFEED_HOME = oldAgentFeedHome;
  if (oldBase === undefined) delete process.env.AGENTFEED_API_BASE_URL;
  else process.env.AGENTFEED_API_BASE_URL = oldBase;
  if (oldToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = oldToken;
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
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'https://api.agentfeed.dev/v1?debug=true' })).rejects.toThrow(/query or hash/i);
  });

  it('normalizes valid API base URLs from env and files', async () => {
    process.env.AGENTFEED_API_BASE_URL = 'https://api.agentfeed.dev/v1/';
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('https://api.agentfeed.dev/v1');

    delete process.env.AGENTFEED_API_BASE_URL;
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=\"http://localhost:8001/v1/\"\n');
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('http://localhost:8001/v1');
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
