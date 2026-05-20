import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createCliAuthSession, exchangeCliAuthSession, AgentFeedApiError } from '../api/client.js';
import { resolveApiBaseUrl } from '../config/api-base.js';
import { saveCredentials } from '../config/credentials.js';
import { openBrowser } from '../utils/open-browser.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const rl = createInterface({ input, output });
  try {
    await rl.question('After approving in the browser, press Enter here to finish login...');
  } finally {
    rl.close();
  }

  const deadline = Date.now() + (options.waitMs ?? 30_000);
  const intervalMs = Math.max(1, session.poll_interval_seconds) * 1000;
  let lastError: unknown;
  do {
    try {
      const exchange = await exchangeCliAuthSession(apiBaseUrl, session.session_id, verifier);
      return saveCredentials(exchange.token, { apiBaseUrl, user: exchange.user });
    } catch (error) {
      lastError = error;
      if (!(error instanceof AgentFeedApiError) || error.code !== 'CLI_AUTH_SESSION_PENDING') {
        throw error;
      }
      await sleep(intervalMs);
    }
  } while (Date.now() < deadline);

  throw lastError instanceof Error ? lastError : new Error('CLI authorization was not completed.');
}
