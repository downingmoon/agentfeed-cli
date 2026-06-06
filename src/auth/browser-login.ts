import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { stdin as input, stdout as output } from 'node:process';
import { createCliAuthSession, exchangeCliAuthSession, AgentFeedApiError, checkApiCompatibility } from '../api/client.js';
import { resolveApiBaseUrlWithMetadata } from '../config/api-base.js';
import { credentialsFromToken, saveCredentials } from '../config/credentials.js';
import { openBrowser } from '../utils/open-browser.js';
import type { CliAuthExchangeResult, CliAuthSession } from '../types.js';
import * as ui from '../cli/ui.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDefaultRetryableCliAuthExchangeError(error: unknown): boolean {
  if (error instanceof AgentFeedApiError) {
    if (error.code === 'API_RESPONSE_INVALID') return false;
    return error.code === 'CLI_AUTH_SESSION_PENDING'
      || error.status === 408
      || error.status === 429
      || error.status >= 500;
  }
  return error instanceof TypeError;
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
  const isPendingError = options.isPendingError ?? isDefaultRetryableCliAuthExchangeError;
  const deadline = Date.now() + (options.waitMs ?? 120_000);
  const intervalMs = Math.max(1, options.session.poll_interval_seconds) * 1000;

  while (Date.now() < deadline) {
    try {
      return await exchange(options.apiBaseUrl, options.session.session_id, options.verifier);
    } catch (error) {
      if (!isPendingError(error)) throw error;
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const sleepMs = Math.min(intervalMs, remainingMs);
      await sleepFn(sleepMs);
      if (sleepMs >= remainingMs) break;
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
    && options.allowCiBrowser !== true;
}

function ciBrowserLoginBlockedMessage(): string {
  return [
    'Browser login is disabled in CI.',
    'If AGENTFEED_TOKEN is already set, run non-login AgentFeed commands directly.',
    'Otherwise provide a token safely:',
    'Run: printf %s "$TOKEN" | agentfeed login --token-stdin',
    'To intentionally run browser auth in this environment:',
    'Run: agentfeed login --browser',
    'Run: agentfeed rotate --browser'
  ].join('\n');
}

async function requireApiCompatibilityBeforeCredentialSave(apiBaseUrl: string): Promise<void> {
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible) return;
  const detail = result.status != null
    ? `HTTP ${result.status}`
    : result.error ?? 'unknown compatibility failure';
  throw new Error([
    `API compatibility check failed for ${result.url}: ${detail} before saving credentials.`,
    'Run: agentfeed doctor'
  ].join('\n'));
}

export async function browserLogin(options: { apiBaseUrl?: string; noOpen?: boolean; waitMs?: number; save?: boolean; cwd?: string; storedApiBaseUrl?: string; allowCiBrowser?: boolean; replaceTokenId?: string } = {}) {
  if (ciBrowserLoginBlocked(options)) {
    throw new Error(ciBrowserLoginBlockedMessage());
  }
  const apiResolution = await resolveApiBaseUrlWithMetadata({
    cwd: options.cwd,
    explicitApiBaseUrl: options.apiBaseUrl,
    storedApiBaseUrl: options.storedApiBaseUrl,
    trustRepoDiscoveredApiBase: process.env.AGENTFEED_TRUST_REPO_API_BASE === '1',
  });
  const apiBaseUrl = apiResolution.value;
  output.write(`${ui.heading('AgentFeed browser authorization')}\n`);
  if (apiResolution.warnings.length) {
    output.write(`\n${ui.section('Warnings')}\n`);
    for (const warning of apiResolution.warnings) output.write(`Warning: ${warning}\n`);
  }
  output.write(`\n${ui.section('Connection')}\n`);
  output.write(`Using AgentFeed API: ${apiBaseUrl}\n`);
  if (options.save !== false || options.replaceTokenId) {
    await requireApiCompatibilityBeforeCredentialSave(apiBaseUrl);
  }
  const verifier = randomBytes(32).toString('hex');
  const session = await createCliAuthSession(apiBaseUrl, {
    verifier,
    deviceName: hostname(),
    replaceTokenId: options.replaceTokenId,
  });

  output.write(`\n${ui.section('Authorize')}\n`);
  output.write(`Open this URL to authorize AgentFeed CLI:\n  ${ui.command(session.authorize_url)}\n`);
  output.write(`Approval code: ${session.user_code}\n`);
  output.write('Enter this code in the browser before approving the CLI session.\n\n');
  if (!options.noOpen) {
    const opened = await openBrowser(session.authorize_url);
    if (!opened) {
      output.write('Could not confirm the browser opener. If no browser opened, copy the URL above into your browser.\n\n');
    }
  }

  output.write(`${ui.section('Next')}\n`);
  output.write('Waiting for browser approval. This terminal will finish automatically after approval.\n');
  if (input.isTTY) output.write('Keep this command running; no Enter key is required.\n');

  const exchange = await waitForCliAuthExchange({ apiBaseUrl, session, verifier, waitMs: options.waitMs });
  if (options.save === false) return credentialsFromToken(exchange.token, { apiBaseUrl, tokenId: exchange.token_id ?? null, user: exchange.user, tokenExpiresAt: exchange.token_expires_at });
  return saveCredentials(exchange.token, { apiBaseUrl, tokenId: exchange.token_id ?? null, user: exchange.user, tokenExpiresAt: exchange.token_expires_at });
}
