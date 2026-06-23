import { describe, expect, it } from 'vitest';
import { loadCredentialsWithMetadata } from '../src/config/credentials.js';
import { useCredentialResolutionFixture } from './config-credential-resolution-helpers.js';

const fixture = useCredentialResolutionFixture();

describe('credential file validation', () => {
  it('ignores malformed credentials files with a warning instead of crashing', async () => {
    await fixture.writeMalformedCredentialsFile('{ this is not json');

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials).toBeNull();
    expect(resolved.token_source).toBe('missing');
    expect(resolved.credentials_file_exists).toBe(true);
    expect(resolved.warnings.join('\n')).toContain('ignored malformed AgentFeed credentials file');
    expect(resolved.warnings.join('\n')).toContain(fixture.credentialsPath());
  });

  it('uses environment tokens even when the credentials file is malformed', async () => {
    await fixture.writeMalformedCredentialsFile('{ this is not json');
    process.env.AGENTFEED_TOKEN = 'af_live_env_secret';
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_secret');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.api_base_url).toBe('http://localhost:8001/v1');
    expect(resolved.warnings.join('\n')).toContain('ignored malformed AgentFeed credentials file');
  });

  it('ignores stored credentials fields with invalid runtime types instead of flowing them into credentials', async () => {
    delete process.env.AGENTFEED_TOKEN;
    await fixture.writeCredentialsFile({
      ingestion_token: 123,
      api_base_url: ['https://collector.example/v1'],
      token_expires_at: false,
      created_at: { at: 'now' },
      user: 'not-object',
      credential_store: 'file'
    });

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials).toBeNull();
    expect(resolved.token_source).toBe('missing');
    expect(resolved.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.warnings.join('\n')).toContain('ignored invalid AgentFeed credentials field ingestion_token');
    expect(resolved.warnings.join('\n')).toContain('ignored invalid AgentFeed credentials field api_base_url');
    expect(resolved.warnings.join('\n')).toContain(fixture.credentialsPath());
  });

  it('lets AGENTFEED_TOKEN win over invalid stored credential shapes with warnings', async () => {
    await fixture.writeCredentialsFile({
      ingestion_token: 123,
      api_base_url: { href: 'https://collector.example/v1' },
      created_at: 0
    });
    process.env.AGENTFEED_TOKEN = 'af_live_env_shape_guard';

    const resolved = await loadCredentialsWithMetadata({ cwd: fixture.dir() });

    expect(resolved.credentials?.ingestion_token).toBe('af_live_env_shape_guard');
    expect(resolved.token_source).toBe('environment');
    expect(resolved.credentials?.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(resolved.warnings.join('\n')).toContain('ignored invalid AgentFeed credentials field api_base_url');
  });
});
