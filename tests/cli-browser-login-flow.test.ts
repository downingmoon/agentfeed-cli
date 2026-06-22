import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserLogin } from '../src/auth/browser-login.js';
import { saveCredentials } from '../src/config/credentials.js';
import { initProject } from '../src/config/project-config.js';

let dir: string;
let home: string;

const oldHome = process.env.HOME;
const oldAgentFeedCi = process.env.AGENTFEED_CI;
const oldCi = process.env.CI;
const oldGithubActions = process.env.GITHUB_ACTIONS;
const oldAgentFeedToken = process.env.AGENTFEED_TOKEN;
const oldTrustRepoApiBase = process.env.AGENTFEED_TRUST_REPO_API_BASE;

function validIngestionStatusResponse(tokenId = 'token-login-ok'): Response {
  return new Response(JSON.stringify({
    data: {
      ok: true,
      user: { id: 'user-login-ok', username: 'cli-user', display_name: 'CLI User', avatar_url: null },
      token: {
        id: tokenId,
        name: 'CLI login token',
        created_at: '2026-06-01T00:00:00Z',
        last_used_at: null,
        expires_at: '2026-06-15T00:00:00Z',
        expires_in_seconds: 1_000_000,
        expiring_soon: false
      }
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsedRequestBody(init: RequestInit | undefined): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(init?.body ?? '{}'));
  if (!isRecord(parsed)) throw new Error('expected request body object');
  return parsed;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-login-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedCi === undefined) delete process.env.AGENTFEED_CI;
  else process.env.AGENTFEED_CI = oldAgentFeedCi;
  if (oldCi === undefined) delete process.env.CI;
  else process.env.CI = oldCi;
  if (oldGithubActions === undefined) delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS = oldGithubActions;
  if (oldAgentFeedToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = oldAgentFeedToken;
  if (oldTrustRepoApiBase === undefined) delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  else process.env.AGENTFEED_TRUST_REPO_API_BASE = oldTrustRepoApiBase;
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('CLI browser login flow', () => {
  it.each([
    { data: { token: '' }, label: 'empty token' },
    { data: { token: 'af_live_missing_token_id', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One' } }, label: 'missing token_id' },
    { data: { token: 'af_live_missing_expiry', token_id: 'token-1', user: { id: 'user-1', display_name: 'User One' } }, label: 'missing token_expires_at' },
    { data: { token: 'af_live_missing_user', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z' }, label: 'missing user' },
    { data: { token: 'af_live_missing_display_name', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1' } }, label: 'missing user display_name' },
    { data: { token: 'af_live_test', token_id: 123 }, label: 'invalid token_id' },
    { data: { token: 'af_live_bad_expiry', token_id: 'token-1', token_expires_at: 'not-a-date', user: { id: 'user-1', display_name: 'User One' } }, label: 'invalid token_expires_at' },
    { data: { token: 'af_live_test', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One' }, rotated_from: ['token-old'] }, label: 'invalid rotated_from' },
    { data: { token: 'af_live_test', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One' }, rotated_at: 'tomorrow-ish' }, label: 'invalid rotated_at' },
    { data: { token: 'af_live_bad_user', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 123, display_name: 'User One' } }, label: 'unsafe user object' },
    { data: { token: 'af_live_extra_root', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One' }, extra: 'unexpected' }, label: 'unexpected root field' },
    { data: { token: 'af_live_extra_user', token_id: 'token-1', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One', role: 'admin' } }, label: 'unexpected user field' }
  ])('rejects malformed browser exchange responses before credentials can be saved: $label', async ({ data }) => {
    await saveCredentials('af_live_existing', {
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      user: { id: 'user-existing', username: 'existing' },
      tokenExpiresAt: '2026-06-01T00:00:00Z'
    });
    const before = await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/metadata')) {
        return new Response(JSON.stringify({
          data: {
            service: 'agentfeed-api',
            api_version: 'v1',
            backend_version: '0.1.0',
            contract_version: '2026-06-03',
            review_base_url: 'https://agentfeed.dev',
            supported_clients: {
              cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
              frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
            }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-bad-exchange',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-bad-exchange',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).resolves.toBe(before);
  });

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
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
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
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('completes no-open browser login by exchanging the CLI session and saving credentials', async () => {
    let sessionVerifier: string | undefined;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/metadata')) {
        return new Response(JSON.stringify({
          data: {
            service: 'agentfeed-api',
            api_version: 'v1',
            backend_version: '0.1.0',
            contract_version: '2026-06-03',
            review_base_url: 'https://agentfeed.dev',
            supported_clients: {
              cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
              frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
            }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/auth/cli/sessions')) {
        const body = parsedRequestBody(init);
        expect(body['verifier']).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
        expect(body['device_name']).toBeTruthy();
        sessionVerifier = String(body['verifier']);
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-no-open',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-no-open',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/auth/cli/sessions/session-no-open/exchange')) {
        const body = parsedRequestBody(init);
        expect(body['verifier']).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
        expect(body['verifier']).toBe(sessionVerifier);
        return new Response(JSON.stringify({
          data: {
            token: 'af_live_no_open',
            token_id: 'token-no-open',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: {
              id: 'user-no-open',
              username: 'cli-user',
              display_name: 'CLI User',
              avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
            }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/ingest/status')) return validIngestionStatusResponse('token-no-open');

      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true });

    expect(creds).toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_no_open',
      token_id: 'token-no-open',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: {
        id: 'user-no-open',
        username: 'cli-user',
        display_name: 'CLI User',
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
      }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/metadata', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://api.agentfeed.dev/v1/auth/cli/sessions/session-no-open/exchange', expect.objectContaining({ method: 'POST' }));
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8').then(JSON.parse)).resolves.toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_no_open',
      token_id: 'token-no-open',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: {
        id: 'user-no-open',
        username: 'cli-user',
        display_name: 'CLI User',
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
      }
    });
  });

});
