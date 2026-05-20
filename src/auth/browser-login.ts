import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { stdin as input, stdout as output } from 'node:process';
import { createCliAuthSession, exchangeCliAuthSession, AgentFeedApiError } from '../api/client.js';
import { resolveApiBaseUrl } from '../config/api-base.js';
import { saveCredentials } from '../config/credentials.js';
import { openBrowser } from '../utils/open-browser.js';
import type { CliAuthExchangeResult, CliAuthSession } from '../types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForCliAuthExchange(options: {
  apiBaseUrl: string;
  session: CliAuthSession;
  verifier: string;
  waitMs?: number;
  exchange?: (apiBaseUrl: string, sessionId: string, verifier: string) => Promise<CliAuthExchangeResult>;
  sleep?: (ms: number) => Promise<void>;
  isPendingError?: (error: unknown) => boolean;
}): Promise<CliAuthExchangeResult> {
  const exchange = options.exchange ?? exchangeCliAuthSession;
  const sleepFn = options.sleep ?? sleep;
  const isPendingError = options.isPendingError ?? ((error: unknown) => error instanceof AgentFeedApiError && error.code === 'CLI_AUTH_SESSION_PENDING');
  const deadline = Date.now() + (options.waitMs ?? 120_000);
  const intervalMs = Math.max(1, options.session.poll_interval_seconds) * 1000;
  let lastError: unknown;

  do {
    try {
      return await exchange(options.apiBaseUrl, options.session.session_id, options.verifier);
    } catch (error) {
      lastError = error;
      if (!isPendingError(error)) throw error;
      await sleepFn(intervalMs);
    }
  } while (Date.now() < deadline);

  throw lastError instanceof Error ? lastError : new Error('CLI authorization was not completed.');
}

export async function browserLogin(options: { apiBaseUrl?: string; noOpen?: boolean; waitMs?: number } = {}) {
  const apiBaseUrl = await resolveApiBaseUrl({ explicitApiBaseUrl: options.apiBaseUrl });
  const verifier = randomBytes(32).toString('hex');
  const session = await createCliAuthSession(apiBaseUrl, {
    verifier,
    deviceName: hostname(),
  });

  if (!options.noOpen) {
    await openBrowser(session.authorize_url);
  }

  output.write(`\nOpen this URL to authorize AgentFeed CLI:\n${session.authorize_url}\n\n`);
  output.write('Waiting for browser approval. This terminal will finish automatically after approval.\n');
  if (input.isTTY) output.write('Keep this command running; no Enter key is required.\n');

  const exchange = await waitForCliAuthExchange({ apiBaseUrl, session, verifier, waitMs: options.waitMs });
  return saveCredentials(exchange.token, { apiBaseUrl, user: exchange.user });
}
