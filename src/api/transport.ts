import { AgentFeedApiError } from './errors.js';

const DEFAULT_API_REQUEST_TIMEOUT_MS = 30_000;
export const API_CHECK_TIMEOUT_MS = 3_000;
const DEFAULT_API_RETRY_ATTEMPTS = 3;
const DEFAULT_API_RETRY_BASE_DELAY_MS = 250;

export function apiUrl(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`;
}

function apiRequestTimeoutMs(): number {
  const configured = Number(process.env.AGENTFEED_API_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_API_REQUEST_TIMEOUT_MS;
}

function apiRetryAttempts(): number {
  const configured = Number(process.env.AGENTFEED_API_RETRY_ATTEMPTS);
  if (!Number.isFinite(configured)) return DEFAULT_API_RETRY_ATTEMPTS;
  return Math.max(1, Math.min(5, Math.floor(configured)));
}

function apiRetryBaseDelayMs(): number {
  const configured = Number(process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_API_RETRY_BASE_DELAY_MS;
}

function errorCauseChain(error: unknown): Array<Record<string, unknown>> {
  const chain: Array<Record<string, unknown>> = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === 'object' && !seen.has(current) && chain.length < 6) {
    seen.add(current);
    if (!isRecord(current)) break;
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function diagnosticStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined;
}

function diagnosticHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch (error) {
    if (error instanceof Error) return url;
    throw error;
  }
}

export function describeNetworkFailure(error: unknown, url: string, timeoutMs: number): string {
  const host = diagnosticHostFromUrl(url);
  const chain = errorCauseChain(error);
  const codes = chain.map(item => diagnosticStringField(item.code)).filter((value): value is string => Boolean(value));
  const names = chain.map(item => diagnosticStringField(item.name)).filter((value): value is string => Boolean(value));
  const messages = chain.map(item => diagnosticStringField(item.message)).filter((value): value is string => Boolean(value));
  const text = [...codes, ...names, ...messages].join(' ').toLowerCase();

  if (text.includes('aborterror') || text.includes('aborted')) {
    return `request timed out for ${host} after ${timeoutMs}ms. Check API availability or tune AGENTFEED_API_TIMEOUT_MS.`;
  }
  if (codes.some(code => code === 'ENOTFOUND' || code === 'EAI_AGAIN') || text.includes('getaddrinfo') || text.includes('dns')) {
    return `DNS lookup failed for ${host}. Check AGENTFEED_API_BASE_URL or hosted DNS/deployment.`;
  }
  if (codes.some(code => code === 'ECONNREFUSED')) {
    return `connection refused for ${host}. Check that the AgentFeed API is running and reachable.`;
  }
  if (codes.some(code => code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') || text.includes('timed out') || text.includes('timeout')) {
    return `connection timed out for ${host}. Check API availability or tune AGENTFEED_API_TIMEOUT_MS.`;
  }
  if (
    codes.some(code => code.startsWith('CERT_') || code.startsWith('ERR_TLS') || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'SELF_SIGNED_CERT_IN_CHAIN')
    || text.includes('certificate')
    || text.includes('tls')
    || text.includes('ssl')
  ) {
    return `TLS/certificate verification failed for ${host}. Check the hosted API certificate configuration.`;
  }

  const message = messages.find(value => value !== 'fetch failed') ?? messages[0];
  return message ?? 'unreachable';
}

function networkErrorMessage(error: unknown, options: { readonly localDraftKept?: boolean; readonly url?: string; readonly timeoutMs?: number } = {}): string {
  const reason = options.url
    ? ` ${describeNetworkFailure(error, options.url, options.timeoutMs ?? apiRequestTimeoutMs())}`
    : error instanceof Error && error.message ? ` ${error.message}` : '';
  return options.localDraftKept
    ? `Could not reach AgentFeed API. Local draft was kept.${reason}`
    : `Could not reach AgentFeed API.${reason}`;
}

export async function fetchWithTimeout(url: string, init: RequestInit, options: { readonly localDraftKept?: boolean; readonly timeoutMs?: number } = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? apiRequestTimeoutMs();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new AgentFeedApiError(
        408,
        'API_REQUEST_TIMEOUT',
        options.localDraftKept
          ? 'AgentFeed API request timed out. Local draft was kept; rerun the same publish/share command to reconcile any server-side duplicate.'
          : 'AgentFeed API request timed out.'
      );
    }
    throw new AgentFeedApiError(0, 'API_REQUEST_FAILED', networkErrorMessage(error, { ...options, url, timeoutMs }));
  } finally {
    clearTimeout(timer);
  }
}

function retryAfterMs(details?: Record<string, unknown>): number | null {
  const seconds = Number(details?.retry_after_seconds);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(2_000, seconds * 1000);
}

function isRetryableApiError(error: unknown): error is AgentFeedApiError {
  return error instanceof AgentFeedApiError
    && error.code !== 'API_RESPONSE_INVALID'
    && (error.status === 0 || error.status === 408 || error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  const attempts = apiRetryAttempts();
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableApiError(error)) throw error;
      const retryAfter = retryAfterMs(error.details);
      const delayMs = retryAfter ?? apiRetryBaseDelayMs() * (2 ** (attempt - 1));
      await sleep(delayMs);
    }
  }
  throw lastError;
}
