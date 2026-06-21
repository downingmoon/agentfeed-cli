import { normalizeApiBaseUrl, type ApiBaseUrlResolution } from './api-base.js';
import type { CredentialTokenSource } from './credentials.js';

type StoredApiBaseRecord = {
  readonly api_base_url?: string;
};

export function savedApiBaseWarnings(base: StoredApiBaseRecord | null, tokenSource: CredentialTokenSource): string[] {
  if (tokenSource !== 'environment' || !base?.api_base_url || process.env.AGENTFEED_API_BASE_URL) return [];
  return ['ignored saved AgentFeed API base while using AGENTFEED_TOKEN; set AGENTFEED_API_BASE_URL to intentionally choose a non-default API host.'];
}

export function savedTokenApiBaseOverrideWarnings(
  base: StoredApiBaseRecord | null,
  tokenSource: CredentialTokenSource,
  api: ApiBaseUrlResolution,
): string[] {
  if (tokenSource === 'environment' || tokenSource === 'missing' || !base?.api_base_url) return [];
  if (api.source !== 'environment' || !process.env.AGENTFEED_API_BASE_URL) return [];
  const savedApiBaseUrl = normalizeApiBaseUrl(base.api_base_url);
  if (savedApiBaseUrl === api.value) return [];
  return [
    `saved AgentFeed token belongs to ${savedApiBaseUrl}, but AGENTFEED_API_BASE_URL is sending requests to ${api.value}. ` +
    'Tokens are API-host specific; unset AGENTFEED_API_BASE_URL to use the saved host, or run agentfeed login again with the intended AGENTFEED_API_BASE_URL before publishing.'
  ];
}
