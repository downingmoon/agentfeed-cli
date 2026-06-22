import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { browserLogin } from '../src/auth/browser-login.js';
import { useBrowserLoginFlowFixture } from './cli-browser-login-flow-helpers.js';

const fixture = useBrowserLoginFlowFixture();

describe('CLI browser login CI environment guard', () => {
  it.each(['AGENTFEED_CI', 'CI', 'GITHUB_ACTIONS'])('fails fast in %s instead of opening browser auth when no token or browser override is provided', async (envName) => {
    process.env[envName] = '1';
    delete process.env.AGENTFEED_TOKEN;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const startedAt = Date.now();

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true }))
      .rejects.toThrow(/AGENTFEED_TOKEN|agentfeed login --token|--browser/);

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(fixture.credentialsPath(), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['AGENTFEED_CI', 'CI', 'GITHUB_ACTIONS'])('fails fast in %s instead of opening browser auth when an environment token already exists', async (envName) => {
    process.env[envName] = '1';
    process.env.AGENTFEED_TOKEN = 'af_live_existing_ci_token';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const startedAt = Date.now();

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true }))
      .rejects.toThrow(/Browser login is disabled in CI|AGENTFEED_TOKEN|--browser/);

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(fixture.credentialsPath(), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
