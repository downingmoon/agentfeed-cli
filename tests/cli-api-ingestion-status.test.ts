import { describe, expect, it, vi } from 'vitest';
import {
  checkIngestionToken
} from '../src/api/client.js';
import { useApiHealthCheckEnvironment } from './cli-api-health-checks-helpers.js';

useApiHealthCheckEnvironment();

describe('CLI API ingestion token health checks', () => {
  it('checks ingestion token validity without uploading a draft and parses lifecycle metadata', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        ok: true,
        user: {
          id: 'user-1',
          username: 'downingmoon',
          display_name: 'Downing Moon',
          avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
        },
        token: {
          id: 'token-1',
          name: 'CLI: MacBook',
          created_at: '2026-06-01T00:00:00Z',
          last_used_at: null,
          expires_at: '2026-06-15T00:00:00Z',
          expires_in_seconds: 1_000_000,
          expiring_soon: false
        }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkIngestionToken({ ingestion_token: 'af_live_test', api_base_url: 'http://localhost:8001/v1', created_at: 'now' });

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/v1/ingest/status' });
    expect(result.data?.token?.expires_at).toBe('2026-06-15T00:00:00Z');
    expect(result.data?.token?.expiring_soon).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/v1/ingest/status', expect.objectContaining({
      method: 'GET',
      headers: { authorization: 'Bearer af_live_test' }
    }));
  });

  it.each([
    {
      label: 'non-json status response',
      response: new Response('<html>not status</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      error: 'AgentFeed API ingestion status response is not JSON.'
    },
    {
      label: 'invalid-json status response',
      response: new Response('{not-valid-json', { status: 200, headers: { 'content-type': 'application/json' } }),
      error: 'AgentFeed API ingestion status response contains invalid JSON.'
    },
    {
      label: 'missing data envelope',
      response: new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      error: 'AgentFeed API ingestion status response is missing the data envelope.'
    },
    {
      label: 'unexpected data envelope field',
      response: new Response(JSON.stringify({ data: { ok: true }, debug: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      error: 'AgentFeed API ingestion status response has unexpected data envelope fields.'
    }
  ])('reports malformed ingestion status responses clearly: $label', async ({ response, error }) => {
    vi.stubGlobal('fetch', vi.fn(async () => response));

    await expect(checkIngestionToken({ ingestion_token: 'af_live_bad_status', api_base_url: 'http://localhost:8001/v1', created_at: 'now' }))
      .resolves.toMatchObject({
        ok: false,
        status: 200,
        url: 'http://localhost:8001/v1/ingest/status',
        error
      });
  });

  it.each([
    { data: { ok: true, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false } }, label: 'missing user' },
    { data: { ok: true, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false } }, label: 'missing created_at' },
    { data: { ok: true, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: 'not-a-date', expires_in_seconds: 100, expiring_soon: false } }, label: 'invalid expires_at' },
    { data: { ok: false, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false } }, label: 'false ok flag' },
    { data: { ok: 'true', user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false } }, label: 'string ok flag' },
    { data: { ok: true, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: -1, expiring_soon: false } }, label: 'negative expires_in_seconds' },
    { data: { ok: true, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: 'no' } }, label: 'invalid expiring_soon' },
    { data: { ok: true, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false }, extra: 'unexpected' }, label: 'unexpected status root field' },
    { data: { ok: true, user: { id: 'user-1', role: 'admin' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false } }, label: 'unexpected user field' },
    { data: { ok: true, user: { id: 'user-1' }, token: { id: 'token-1', name: 'CLI: MacBook', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', expires_in_seconds: 100, expiring_soon: false, raw_token_hash: 'secret' } }, label: 'unexpected token field' }
  ])('treats malformed ingestion status responses as unhealthy: $label', async ({ data }) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(checkIngestionToken({ ingestion_token: 'af_live_bad_contract', api_base_url: 'http://localhost:8001/v1', created_at: 'now' }))
      .resolves.toMatchObject({
        ok: false,
        status: 200,
        error: 'AgentFeed API returned an invalid ingestion token status response.'
      });
  });

  it('reports invalid ingestion token as an unhealthy token check', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }), { status: 401, headers: { 'content-type': 'application/json' } })));

    await expect(checkIngestionToken({ ingestion_token: 'af_live_bad', api_base_url: 'http://localhost:8001/v1', created_at: 'now' })).resolves.toMatchObject({
      ok: false,
      status: 401,
      error: 'INGESTION_TOKEN_INVALID: Invalid ingestion token'
    });
  });

  it.each([
    { label: 'unexpected error envelope field', body: { error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} }, debug: true } },
    { label: 'unexpected error detail field', body: { error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {}, debug: true } } },
    { label: 'missing details field', body: { error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token' } } }
  ])('reports malformed ingestion token error responses clearly: $label', async ({ body }) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 401, headers: { 'content-type': 'application/json' } })));

    await expect(checkIngestionToken({ ingestion_token: 'af_live_bad_error', api_base_url: 'http://localhost:8001/v1', created_at: 'now' })).resolves.toMatchObject({
      ok: false,
      status: 401,
      error: 'AgentFeed API ingestion status error response is missing the error envelope.'
    });
  });
});
