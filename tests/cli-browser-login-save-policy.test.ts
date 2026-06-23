import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { browserLogin } from '../src/auth/browser-login.js';
import {
  useBrowserLoginFlowFixture,
  validIngestionStatusResponse,
} from './cli-browser-login-flow-helpers.js';

const fixture = useBrowserLoginFlowFixture();

describe('CLI browser login save policy', () => {
  it('refuses browser login before saving when the exchanged ingestion token is invalid', async () => {
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
            session_id: 'session-invalid-token',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-invalid-token',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions/session-invalid-token/exchange')) {
        return new Response(JSON.stringify({
          data: {
            token: 'af_live_invalid_after_exchange',
            token_id: 'token-invalid-after-exchange',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: { id: 'user-invalid-token', username: 'bad-token-user', display_name: 'Bad Token User' }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/ingest/status')) {
        return new Response(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid or revoked ingestion token.', details: {} } }), { status: 401, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true }))
      .rejects.toThrow(/Ingestion token check failed.*before saving credentials/);

    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/ingest/status', expect.objectContaining({
      method: 'GET',
      headers: { authorization: 'Bearer af_live_invalid_after_exchange' }
    }));
    await expect(readFile(fixture.credentialsPath(), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses browser login before session creation and credential saving when API metadata is incompatible', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/metadata')) {
        return new Response(JSON.stringify({ data: { service: 'agentfeed-api', api_version: 'v0' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: { code: 'UNEXPECTED_SESSION_REQUEST', message: 'Unexpected session request', details: {} } }), { status: 500, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true }))
      .rejects.toThrow(/API compatibility check failed.*before saving credentials/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/metadata', expect.objectContaining({ method: 'GET' }));
    await expect(readFile(fixture.credentialsPath(), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('completes no-open browser login without saving credentials when requested', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-ephemeral',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-ephemeral',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/auth/cli/sessions/session-ephemeral/exchange')) {
        return new Response(JSON.stringify({
          data: {
            token: 'af_live_ephemeral',
            token_id: 'token-ephemeral',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: { id: 'user-ephemeral', username: 'no-save-user', display_name: 'No Save User' }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/ingest/status')) return validIngestionStatusResponse('token-ephemeral');

      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1/', noOpen: true, waitMs: 50, save: false, allowCiBrowser: true });

    expect(creds).toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_ephemeral',
      token_id: 'token-ephemeral',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-ephemeral', username: 'no-save-user', display_name: 'No Save User' }
    });
    await expect(readFile(fixture.credentialsPath(), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
