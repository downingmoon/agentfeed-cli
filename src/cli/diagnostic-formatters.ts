import type { ApiBaseUrlSource } from '../config/api-base.js';
import type { CredentialsResolution, CredentialTokenSource } from '../config/credentials.js';
import * as ui from './ui.js';

export type ReadinessStatus = 'ready' | 'attention';

export function formatWarningLines(warning: string): string[] {
  return ui.wrapKeyValue('Warning', warning).map((line) => ui.warn(line));
}

export function credentialSourceLabel(source: CredentialTokenSource): string {
  switch (source) {
    case 'environment': return 'environment (AGENTFEED_TOKEN)';
    case 'credentials_file': return 'saved credentials file';
    case 'keychain': return 'OS keychain';
    case 'missing': return 'missing';
  }
}

export function credentialStoreLabel(source: CredentialsResolution['credential_store']): string {
  switch (source) {
    case 'environment': return 'environment (AGENTFEED_TOKEN)';
    case 'file': return 'private credentials file';
    case 'keychain': return 'OS keychain';
    case 'missing': return 'missing';
  }
}

export function apiBaseSourceLabel(source: ApiBaseUrlSource, detail?: string): string {
  const suffix = detail ? ` (${detail})` : '';
  switch (source) {
    case 'explicit': return `explicit CLI option${suffix}`;
    case 'environment': return `environment (AGENTFEED_API_BASE_URL)`;
    case 'stored_credentials': return `saved credentials file${suffix}`;
    case 'env_file': return `discovered env file${suffix}`;
    case 'default': return `default${suffix}`;
  }
}

export function formatTokenExpiry(expiresAt: string): string {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return expiresAt;
  const deltaMs = expires - Date.now();
  const absMs = Math.abs(deltaMs);
  const days = Math.floor(absMs / 86_400_000);
  const hours = Math.floor((absMs % 86_400_000) / 3_600_000);
  const relative = deltaMs < 0 ? `expired ${days}d ${hours}h ago` : `in ${days}d ${hours}h`;
  return `${new Date(expires).toISOString()} (${relative})`;
}

export function formatCollectionCursor(value?: string | null): string {
  if (!value) return 'none';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return `invalid (${value})`;
  return new Date(parsed).toISOString();
}

export function nextDefaultCollectionSince(value?: string | null): string {
  return value ? formatCollectionCursor(value) : 'beginning';
}

export function tokenExpiryWarning(expiresAt?: string | null, expiringSoon?: boolean): string | null {
  if (!expiresAt) return null;
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return null;
  if (expires <= Date.now()) return 'ingestion token is expired. Run: agentfeed rotate';
  if (expiringSoon || expires - Date.now() <= 7 * 86_400_000) return 'ingestion token expires soon. Run: agentfeed rotate to replace this device token.';
  return null;
}

export function readinessMarker(status: ReadinessStatus): string {
  return status === 'ready' ? ui.good('✓') : ui.warn('!');
}
