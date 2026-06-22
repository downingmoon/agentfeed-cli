import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { browserLogin } from '../src/auth/browser-login.js';
import { saveCredentials } from '../src/config/credentials.js';
import {
  apiMetadataResponse,
  cliAuthSessionResponse,
  useBrowserLoginFlowFixture,
} from './cli-browser-login-flow-helpers.js';

const fixture = useBrowserLoginFlowFixture();

const malformedExchangeCases = [
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
] as const;

describe('CLI browser login exchange validation', () => {
  it.each(malformedExchangeCases)('rejects malformed browser exchange responses before credentials can be saved: $label', async ({ data }) => {
    await saveCredentials('af_live_existing', {
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      user: { id: 'user-existing', username: 'existing' },
      tokenExpiresAt: '2026-06-01T00:00:00Z'
    });
    const before = await readFile(fixture.credentialsPath(), 'utf8');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/metadata')) return apiMetadataResponse();
      if (url.endsWith('/auth/cli/sessions')) return cliAuthSessionResponse('session-bad-exchange');
      return new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    await expect(readFile(fixture.credentialsPath(), 'utf8')).resolves.toBe(before);
  });
});
