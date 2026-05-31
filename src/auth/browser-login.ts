import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { stdin as input, stdout as output } from 'node:process';
import { createCliAuthSession, exchangeCliAuthSession, AgentFeedApiError } from '../api/client.js';
import { resolveApiBaseUrlWithMetadata } from '../config/api-base.js';
import { credentialsFromToken, saveCredentials } from '../config/credentials.js';
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

  while (Date.now() < deadline) {
    try {
      return await exchange(options.apiBaseUrl, options.session.session_id, options.verifier);
    } catch (error) {
      if (!isPendingError(error)) throw error;
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      await sleepFn(Math.min(intervalMs, remainingMs));
    }
  }

  throw new Error('CLI authorization timed out. Re-run agentfeed login and approve the browser prompt before the session expires.');
}

const CI_ENVIRONMENT_VARIABLES = [
  'AGENTFEED_CI',
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'BUILDKITE',
  'CIRCLECI',
  'JENKINS_URL',
  'TF_BUILD',
  'TEAMCITY_VERSION',
  'VERCEL',
  'NETLIFY',
];

function isTruthyEnvironmentValue(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

function ciBrowserLoginBlocked(options: { allowCiBrowser?: boolean }): boolean {
  return CI_ENVIRONMENT_VARIABLES.some((name) => isTruthyEnvironmentValue(process.env[name]))
    && !process.env.AGENTFEED_TOKEN
    && options.allowCiBrowser !== true;
}

export async function browserLogin(options: { apiBaseUrl?: string; noOpen?: boolean; waitMs?: number; save?: boolean; cwd?: string; storedApiBaseUrl?: string; allowCiBrowser?: boolean } = {}) {
  if (ciBrowserLoginBlocked(options)) {
    throw new Error('Browser login is disabled in CI. Set AGENTFEED_TOKEN or pipe a token with: printf %s "$TOKEN" | agentfeed login --token-stdin. To intentionally run browser auth anyway, pass --browser.');
  }
  const apiResolution = await resolveApiBaseUrlWithMetadata({
    cwd: options.cwd,
    explicitApiBaseUrl: options.apiBaseUrl,
    storedApiBaseUrl: options.storedApiBaseUrl,
    trustRepoDiscoveredApiBase: process.env.AGENTFEED_TRUST_REPO_API_BASE === '1',
  });
  const apiBaseUrl = apiResolution.value;
  for (const warning of apiResolution.warnings) output.write(`Warning: ${warning}\n`);
  output.write(`Using AgentFeed API: ${apiBaseUrl}\n`);
  const verifier = randomBytes(32).toString('hex');
  const session = await createCliAuthSession(apiBaseUrl, {
    verifier,
    deviceName: hostname(),
  });

  output.write(`\nOpen this URL to authorize AgentFeed CLI:\n${session.authorize_url}\n\n`);
  if (!options.noOpen) {
    const opened = await openBrowser(session.authorize_url);
    if (!opened) {
      output.write('Could not confirm the browser opener. If no browser opened, copy the URL above into your browser.\n\n');
    }
  }

  output.write('Waiting for browser approval. This terminal will finish automatically after approval.\n');
  if (input.isTTY) output.write('Keep this command running; no Enter key is required.\n');

  const exchange = await waitForCliAuthExchange({ apiBaseUrl, session, verifier, waitMs: options.waitMs });
  if (options.save === false) return credentialsFromToken(exchange.token, { apiBaseUrl, user: exchange.user, tokenExpiresAt: exchange.token_expires_at });
  return saveCredentials(exchange.token, { apiBaseUrl, user: exchange.user, tokenExpiresAt: exchange.token_expires_at });
}
