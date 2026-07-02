import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCliAuthSession, exchangeCliAuthSession } from '../src/api/client.js';

const oldAgentFeedAllowInsecureApi = process.env.AGENTFEED_ALLOW_INSECURE_API;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsedRequestBody(init: RequestInit | undefined): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(init?.body ?? '{}'));
  if (!isRecord(parsed)) throw new Error('expected request body object');
  return parsed;
}

afterEach(() => {
  if (oldAgentFeedAllowInsecureApi === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  else process.env.AGENTFEED_ALLOW_INSECURE_API = oldAgentFeedAllowInsecureApi;
  vi.unstubAllGlobals();
});

describe('CLI auth session API client', () => {
  it('creates and exchanges a browser login session', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (url.endsWith('/auth/cli/sessions')) {
        const body = parsedRequestBody(init);
        expect(body['replace_token_id']).toBe('token-old');
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-1',
            authorize_url: 'https://agentfeed.downingmoon.dev/cli/authorize?session_id=session-1&status_token=status-token-for-session-1',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 2
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        data: {
          token: 'af_live_test',
          token_id: 'token-new',
          token_expires_at: '2026-06-15T00:00:00Z',
          rotated_from: 'token-old',
          rotated_at: '2026-05-30T00:01:00Z',
          user: {
            id: 'user-1',
            username: 'downingmoon',
            display_name: 'Downing Moon',
            avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
          }
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await createCliAuthSession('https://agentfeed.api.downingmoon.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox', replaceTokenId: 'token-old' });
    const exchange = await exchangeCliAuthSession('https://agentfeed.api.downingmoon.dev/v1', session.session_id, 'verifier-1');

    expect(session.authorize_url).toContain('/cli/authorize');
    expect(session.authorize_url).toContain('status_token=status-token-for-session-1');
    expect(session.user_code).toBe('123-456');
    expect(exchange.token).toBe('af_live_test');
    expect(exchange.token_id).toBe('token-new');
    expect(exchange.token_expires_at).toBe('2026-06-15T00:00:00Z');
    expect(exchange.rotated_from).toBe('token-old');
    expect(exchange.rotated_at).toBe('2026-05-30T00:01:00Z');
    expect(exchange.user?.avatar_url).toBe('https://avatars.githubusercontent.com/u/4242?v=4');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://agentfeed.api.downingmoon.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://agentfeed.api.downingmoon.dev/v1/auth/cli/sessions/session-1/exchange', expect.objectContaining({ method: 'POST' }));
  });

  it.each([
    {
      label: 'invalid JSON',
      response: () => new Response('{not-valid-json', { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API returned an invalid JSON response.'
    },
    {
      label: 'missing data envelope',
      response: () => new Response(JSON.stringify({ session_id: 'session-missing-envelope' }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API response is missing the data envelope.'
    }
  ])('rejects malformed CLI auth success envelopes clearly: $label', async ({ response, message }) => {
    vi.stubGlobal('fetch', vi.fn(async () => response()));

    await expect(createCliAuthSession('https://agentfeed.api.downingmoon.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({
        status: 502,
        code: 'API_RESPONSE_INVALID',
        message
      });
  });

  it('rejects browser login authorize URLs with unexpected query parameters', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-extra-query',
        authorize_url: 'https://agentfeed.downingmoon.dev/cli/authorize?session_id=session-extra-query&status_token=status-token-for-session-extra&next=https%3A%2F%2Fevil.example',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 2
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('https://agentfeed.api.downingmoon.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('rejects untrusted browser login authorize URLs before opening them', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-evil',
        authorize_url: 'https://evil.example/cli/authorize?session_id=session-evil',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 2
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('https://agentfeed.api.downingmoon.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('rejects browser login sessions without a human approval code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-without-code',
        authorize_url: 'https://agentfeed.downingmoon.dev/cli/authorize?session_id=session-without-code',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 2
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('https://agentfeed.api.downingmoon.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('allows local authorize URLs only for local API bases', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-local',
        authorize_url: 'http://localhost:3001/cli/authorize?session_id=session-local',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('http://localhost:8001/v1', { verifier: 'verifier-local' }))
      .resolves.toMatchObject({ session_id: 'session-local' });
  });

  it('accepts public IPv4 HTTP authorize URLs only under the explicit insecure API override', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-public-ip',
        authorize_url: 'http://161.33.171.81:13030/cli/authorize?session_id=session-public-ip&status_token=status-token-for-public-ip',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    delete process.env.AGENTFEED_ALLOW_INSECURE_API;
    await expect(createCliAuthSession('http://161.33.171.81:18080/v1', { verifier: 'verifier-public-ip' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    process.env.AGENTFEED_ALLOW_INSECURE_API = '1';
    await expect(createCliAuthSession('http://161.33.171.81:18080/v1', { verifier: 'verifier-public-ip' }))
      .resolves.toMatchObject({ session_id: 'session-public-ip' });
  });

  it('rejects fake 127-prefixed authorize hostnames for local API bases', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-fake-local',
        authorize_url: 'http://127.evil.com:3001/cli/authorize?session_id=session-fake-local',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('http://localhost:8001/v1', { verifier: 'verifier-local' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

});
