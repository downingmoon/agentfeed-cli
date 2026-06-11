import { describe, expect, it } from 'vitest';
import { AgentFeedApiError } from '../src/api/errors.js';
import { parseCliAuthExchangeResult } from '../src/api/cli-auth-response.js';

const validExchangeResponse = {
  token: 'af_live_test',
  token_id: 'token-1',
  token_expires_at: '2026-06-15T00:00:00Z',
  user: { id: 'user-1', display_name: 'User One' },
};

function parseInvalidExchangeResponse(payload: Record<string, unknown>): AgentFeedApiError {
  try {
    parseCliAuthExchangeResult(payload);
  } catch (error) {
    if (error instanceof AgentFeedApiError) return error;
    throw error;
  }
  throw new Error('invalid exchange response was accepted');
}

describe('CLI auth exchange response contract', () => {
  it('requires rotation metadata fields to be provided together', () => {
    const rotated = parseCliAuthExchangeResult({
      ...validExchangeResponse,
      rotated_from: 'token-old',
      rotated_at: '2026-06-15T00:01:00Z',
    });
    expect(rotated.rotated_from).toBe('token-old');
    expect(rotated.rotated_at).toBe('2026-06-15T00:01:00Z');

    for (const payload of [
      { ...validExchangeResponse, rotated_from: 'token-old' },
      { ...validExchangeResponse, rotated_at: '2026-06-15T00:01:00Z' },
    ]) {
      expect(parseInvalidExchangeResponse(payload).code).toBe('API_RESPONSE_INVALID');
    }
  });
});
