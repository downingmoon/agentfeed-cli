import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialsPath, globalAgentFeedDir, loadCredentialsWithMetadata, resolveCredentials } from '../src/config/credentials.js';

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

describe('credential resolution config', () => {
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

  it('warns when an environment API base overrides the saved-token API host', async () => {
    await mkdir(globalAgentFeedDir(), { recursive: true });
    await writeFile(credentialsPath(), JSON.stringify({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    }));
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';

    const resolved = await loadCredentialsWithMetadata({ cwd: dir });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_saved_secret');
    expect(resolved.token_source).toBe('credentials_file');
    expect(resolved.credentials?.api_base_url).toBe('http://localhost:8001/v1');
    expect(resolved.api_base_url_source).toBe('environment');
    expect(resolved.warnings.join('\n')).toContain('saved AgentFeed token belongs to https://collector.example/v1');
    expect(resolved.warnings.join('\n')).toContain('AGENTFEED_API_BASE_URL is sending requests to http://localhost:8001/v1');
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

  it('resolveCredentials reports missing tokens with copyable login commands', async () => {
    let failure: Error | undefined;
    try {
      await resolveCredentials(null);
    } catch (error) {
      failure = error as Error;
    }

    expect(failure?.message).toContain('AgentFeed token is missing.');
    expect(failure?.message).toContain('Run: agentfeed login');
    expect(failure?.message).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
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
  });});
