import { describe, expect, it } from 'vitest';

import { parseCliAuthSession } from '../src/api/cli-auth-response.js';

const API_BASE_URL = 'https://agentfeed.api.downingmoon.dev/v1';
const validSessionResponse = {
  session_id: 'session-1',
  authorize_url: 'https://agentfeed.downingmoon.dev/cli/authorize?session_id=session-1&status_token=status-token-for-session-1',
  user_code: '123-456',
  expires_at: '2026-05-20T00:05:00Z',
  poll_interval_seconds: 2,
};

describe('parseCliAuthSession', () => {
  it('preserves the backend CLI auth session shape when the response is exact', () => {
    const parsed = parseCliAuthSession(validSessionResponse, API_BASE_URL);

    expect(parsed).toEqual(validSessionResponse);
  });

  it('rejects unexpected CLI auth session response fields before browser authorization', () => {
    const withExtraField = { ...validSessionResponse, debug: true };

    expect(() => parseCliAuthSession(withExtraField, API_BASE_URL)).toThrow(/invalid CLI auth session/);
  });
});
