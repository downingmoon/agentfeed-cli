import type { AgentFeedCredentials } from '../types.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import type { ApiMetadata } from './metadata.js';
import { parseCheckData, parseIngestionTokenStatusResponse, type IngestionTokenStatus } from './ingestion-token-status.js';
import { parseMetadataResponse } from './metadata-response.js';
import { trustedReviewOrigin } from './trusted-url.js';
import { API_CHECK_TIMEOUT_MS, apiUrl, describeNetworkFailure } from './transport.js';

export interface ApiCheckResult {
  readonly ok: boolean;
  readonly url: string;
  readonly status?: number;
  readonly error?: string;
  readonly data?: IngestionTokenStatus;
}

export interface ApiCompatibilityCheckResult {
  readonly ok: boolean;
  readonly compatible: boolean;
  readonly url: string;
  readonly status?: number;
  readonly error?: string;
  readonly data?: ApiMetadata;
}

export const EXPECTED_API_VERSION = 'v1';
export const EXPECTED_API_CONTRACT_VERSION = '2026-06-03';

function healthUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  url.pathname = '/health/ready';
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function fetchCheck(url: string, init: RequestInit): Promise<ApiCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: response.ok, url, status: response.status, data: await parseCheckData(response) };
  } catch (error) {
    return { ok: false, url, error: describeNetworkFailure(error, url, API_CHECK_TIMEOUT_MS) };
  } finally {
    clearTimeout(timer);
  }
}

function parseSemverParts(value: string): [number, number, number] | undefined {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(left: string, right: string): number | undefined {
  const leftParts = parseSemverParts(left);
  const rightParts = parseSemverParts(right);
  if (!leftParts || !rightParts) return undefined;
  for (let index = 0; index < 3; index += 1) {
    const a = leftParts[index];
    const b = rightParts[index];
    if (a !== b) return a > b ? 1 : -1;
  }
  return 0;
}

export function apiMetadataCompatible(metadata: ApiMetadata | undefined): boolean {
  if (!metadata) return false;
  const cli = metadata.supported_clients?.cli;
  return metadata.service === 'agentfeed-api'
    && metadata.api_version === EXPECTED_API_VERSION
    && metadata.contract_version === EXPECTED_API_CONTRACT_VERSION
    && trustedReviewOrigin(metadata.review_base_url) !== null
    && cli?.contract_version === EXPECTED_API_CONTRACT_VERSION
    && typeof cli.min_version === 'string'
    && (compareSemver(AGENTFEED_CLI_VERSION, cli.min_version) ?? -1) >= 0;
}

export async function checkApiReachability(apiBaseUrl: string): Promise<ApiCheckResult> {
  return fetchCheck(healthUrl(apiBaseUrl), { method: 'GET' });
}

export async function checkApiCompatibility(apiBaseUrl: string): Promise<ApiCompatibilityCheckResult> {
  const url = apiUrl(apiBaseUrl, '/metadata');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const parsed = await parseMetadataResponse(response);
    const compatible = response.ok && apiMetadataCompatible(parsed.data);
    return {
      ok: response.ok,
      compatible,
      url,
      status: response.status,
      data: parsed.data,
      error: compatible ? undefined : parsed.error ?? 'AgentFeed API compatibility metadata is missing or unsupported.'
    };
  } catch (error) {
    return {
      ok: false,
      compatible: false,
      url,
      error: describeNetworkFailure(error, url, API_CHECK_TIMEOUT_MS)
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkIngestionToken(credentials: AgentFeedCredentials): Promise<ApiCheckResult> {
  const url = apiUrl(credentials.api_base_url, '/ingest/status');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${credentials.ingestion_token}` },
      signal: controller.signal
    });
    const parsed = await parseIngestionTokenStatusResponse(response);
    if (!response.ok) {
      return {
        ok: false,
        url,
        status: response.status,
        data: parsed.data,
        error: parsed.error ?? 'AgentFeed API ingestion token check failed.'
      };
    }
    if (!parsed.data) {
      return {
        ok: false,
        url,
        status: response.status,
        error: parsed.error ?? 'AgentFeed API returned an invalid ingestion token status response.'
      };
    }
    return { ok: true, url, status: response.status, data: parsed.data };
  } catch (error) {
    return { ok: false, url, error: describeNetworkFailure(error, url, API_CHECK_TIMEOUT_MS) };
  } finally {
    clearTimeout(timer);
  }
}
