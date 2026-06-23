import { describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadCredentialsWithMetadata, resolveCredentials } from '../src/config/credentials.js';
import { useCredentialResolutionFixture } from './config-credential-resolution-helpers.js';

const fixture = useCredentialResolutionFixture();

describe('credential resolution config', () => {
  it('does not combine authenticated tokens with repo-local API base discovery unless explicitly trusted', async () => {
    await writeFile(join(fixture.dir(), '.env'), 'BACKEND_PORT=1234\n');
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.credentials?.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.api_base_url_source).toBe('default');
    expect(resolved.warnings.join('\n')).toContain('AGENTFEED_TRUST_REPO_API_BASE=1');
    expect(resolved.warnings.join('\n')).toContain(`${join(fixture.dir(), '.env')}:BACKEND_PORT`);

    process.env.AGENTFEED_TRUST_REPO_API_BASE = '1';
    const trusted = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(trusted.credentials?.api_base_url).toBe('http://localhost:1234/v1');
    expect(trusted.api_base_url_source).toBe('env_file');
  });

  it('does not combine environment tokens with saved custom API bases unless explicitly configured', async () => {
    await fixture.writeCredentialsFile({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    });
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.credentials?.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.api_base_url_source).toBe('default');
    expect(resolved.warnings.join('\n')).toContain('ignored saved AgentFeed API base while using AGENTFEED_TOKEN');

    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';
    const explicit = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(explicit.credentials?.api_base_url).toBe('http://localhost:8001/v1');
    expect(explicit.api_base_url_source).toBe('environment');
    expect(explicit.warnings.join('\n')).not.toContain('ignored saved AgentFeed API base');
  });

  it('warns when an environment API base overrides the saved-token API host', async () => {
    await fixture.writeCredentialsFile({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    });
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_saved_secret');
    expect(resolved.token_source).toBe('credentials_file');
    expect(resolved.credentials?.api_base_url).toBe('http://localhost:8001/v1');
    expect(resolved.api_base_url_source).toBe('environment');
    expect(resolved.warnings.join('\n')).toContain('saved AgentFeed token belongs to https://collector.example/v1');
    expect(resolved.warnings.join('\n')).toContain('AGENTFEED_API_BASE_URL is sending requests to http://localhost:8001/v1');
  });

  it('keeps saved API bases for saved credentials when no environment token is set', async () => {
    await fixture.writeCredentialsFile({
      api_base_url: 'https://collector.example/v1',
      ingestion_token: 'af_live_saved_secret',
      created_at: '2026-06-01T00:00:00.000Z'
    });

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

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
      failure = error instanceof Error ? error : new Error(String(error));
    }

    expect(failure?.message).toContain('AgentFeed token is missing.');
    expect(failure?.message).toContain('Run: agentfeed login');
    expect(failure?.message).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
  });

  it('reports credential and API base provenance without exposing token values in metadata', async () => {
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.api_base_url_source).toBe('environment');
    expect(resolved.api_base_url).toBe('http://localhost:8001/v1');
    expect(JSON.stringify({ ...resolved, credentials: undefined })).not.toContain('af_live_env_secret');

    delete process.env.AGENTFEED_TOKEN;
  });
});
