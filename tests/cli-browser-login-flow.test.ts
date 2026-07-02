import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { browserLogin } from '../src/auth/browser-login.js';
import {
  apiMetadataResponse,
  cliAuthSessionResponse,
  parsedRequestBody,
  useBrowserLoginFlowFixture,
  validIngestionStatusResponse,
} from './cli-browser-login-flow-helpers.js';

const fixture = useBrowserLoginFlowFixture();

describe('CLI browser login no-open flow', () => {
  it('completes no-open browser login by exchanging the CLI session and saving credentials', async () => {
    let sessionVerifier: string | undefined;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/metadata')) return apiMetadataResponse();

      if (url.endsWith('/auth/cli/sessions')) {
        const body = parsedRequestBody(init);
        expect(body['verifier']).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
        expect(body['device_name']).toBeTruthy();
        sessionVerifier = String(body['verifier']);
        return cliAuthSessionResponse('session-no-open');
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

    const creds = await browserLogin({ apiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true });

    expect(creds).toMatchObject({
      api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
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
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://agentfeed.api.downingmoon.dev/v1/metadata', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://agentfeed.api.downingmoon.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://agentfeed.api.downingmoon.dev/v1/auth/cli/sessions/session-no-open/exchange', expect.objectContaining({ method: 'POST' }));
    await expect(readFile(fixture.credentialsPath(), 'utf8').then(JSON.parse)).resolves.toMatchObject({
      api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
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
