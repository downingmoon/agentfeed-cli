import { describe, expect, it, vi } from 'vitest';
import { AgentFeedApiError } from '../src/api/client.js';
import { waitForCliAuthExchange } from '../src/auth/browser-login.js';

describe('CLI browser login polling', () => {
  it('keeps polling the browser login session until it is approved', async () => {
    let attempts = 0;
    const exchange = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('pending');
      }
      return { token: 'af_live_after_approval', token_id: 'token-after-approval', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One' } };
    });

    const result = await waitForCliAuthExchange({
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      session: {
        session_id: 'session-1',
        authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-1',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      },
      verifier: 'verifier-1',
      exchange,
      sleep: async () => undefined,
      isPendingError: (error) => error instanceof Error && error.message === 'pending'
    });

    expect(result.token).toBe('af_live_after_approval');
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it('retries transient browser login exchange failures before succeeding', async () => {
    const exchange = vi.fn(async () => {
      if (exchange.mock.calls.length === 1) {
        throw new AgentFeedApiError(503, 'SERVICE_UNAVAILABLE', 'AgentFeed API is temporarily unavailable.');
      }
      return { token: 'af_live_after_transient_exchange', token_id: 'token-after-transient', token_expires_at: '2026-06-15T00:00:00Z', user: { id: 'user-1', display_name: 'User One' } };
    });

    const result = await waitForCliAuthExchange({
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      session: {
        session_id: 'session-transient',
        authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-transient',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      },
      verifier: 'verifier-transient',
      exchange,
      sleep: async () => undefined
    });

    expect(result.token).toBe('af_live_after_transient_exchange');
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it('does not retry terminal browser login exchange failures', async () => {
    const exchange = vi.fn(async () => {
      throw new AgentFeedApiError(403, 'CLI_AUTH_SESSION_VERIFIER_INVALID', 'CLI authorization verifier is invalid.');
    });

    await expect(waitForCliAuthExchange({
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      session: {
        session_id: 'session-terminal',
        authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-terminal',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      },
      verifier: 'bad-verifier',
      exchange,
      sleep: async () => {
        throw new Error('terminal failures must not sleep/retry');
      }
    })).rejects.toMatchObject({
      status: 403,
      code: 'CLI_AUTH_SESSION_VERIFIER_INVALID'
    });
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it('caps browser login polling sleep to the remaining timeout window', async () => {
    const sleeps: number[] = [];
    const exchange = vi.fn(async () => {
      throw new Error('pending');
    });
    const nowValues = [1000, 1000, 1001, 1019, 1019, 1020];
    let nowIndex = 0;
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      const value = nowValues[Math.min(nowIndex, nowValues.length - 1)];
      nowIndex += 1;
      return value;
    });

    try {
      await expect(waitForCliAuthExchange({
        apiBaseUrl: 'https://api.agentfeed.dev/v1',
        session: {
          session_id: 'session-timeout',
          authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-timeout',
          user_code: '123-456',
          expires_at: '2026-05-20T00:05:00Z',
          poll_interval_seconds: 60
        },
        verifier: 'verifier-timeout',
        waitMs: 20,
        exchange,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        isPendingError: (error) => error instanceof Error && error.message === 'pending'
      })).rejects.toThrow(/timed out/i);
    } finally {
      dateNow.mockRestore();
    }

    expect(exchange).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([19]);
  });

});
