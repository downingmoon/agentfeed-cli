import { describe, expect, it, vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { browserLogin } from '../src/auth/browser-login.js';
import {
  useBrowserLoginFlowFixture,
  validIngestionStatusResponse,
} from './cli-browser-login-flow-helpers.js';

const fixture = useBrowserLoginFlowFixture();

describe('CLI browser login API discovery', () => {
  it('ignores repo-local BACKEND_PORT discovery before auth unless explicitly trusted', async () => {
    await writeFile(join(fixture.dir(), '.env'), 'BACKEND_PORT=8123\n');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-default-api',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-default-api',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions/session-default-api/exchange')) {
        return new Response(JSON.stringify({ data: { token: 'af_live_default_api', token_id: 'token-default-api', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-default-api', display_name: 'Default API User' } } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/ingest/status')) return validIngestionStatusResponse('token-default-api');
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ cwd: fixture.dir(), noOpen: true, waitMs: 50, save: false, allowCiBrowser: true });

    expect(creds.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
  });

  it('accepts repo-local API discovery when AGENTFEED_TRUST_REPO_API_BASE=1', async () => {
    await writeFile(join(fixture.dir(), '.env'), 'BACKEND_PORT=8124\n');
    process.env.AGENTFEED_TRUST_REPO_API_BASE = '1';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-trusted-api',
            authorize_url: 'http://localhost:3001/cli/authorize?session_id=session-trusted-api',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions/session-trusted-api/exchange')) {
        return new Response(JSON.stringify({ data: { token: 'af_live_trusted_api', token_id: 'token-trusted-api', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-trusted-api', display_name: 'Trusted API User' } } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/ingest/status')) return validIngestionStatusResponse('token-trusted-api');
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ cwd: fixture.dir(), noOpen: true, waitMs: 50, save: false, allowCiBrowser: true });

    expect(creds.api_base_url).toBe('http://localhost:8124/v1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8124/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
  });
});
