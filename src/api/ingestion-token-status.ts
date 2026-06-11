import { DATA_RESPONSE_ENVELOPE_FIELDS, apiErrorResponseSummary, hasOnlyExpectedFields } from './response-contract.js';

export interface IngestionTokenStatus {
  readonly ok: boolean;
  readonly user: {
    readonly id: string;
    readonly username?: string | null;
    readonly display_name?: string | null;
    readonly avatar_url?: string | null;
  };
  readonly token: {
    readonly id: string;
    readonly name: string;
    readonly created_at: string;
    readonly last_used_at?: string | null;
    readonly expires_at: string;
    readonly expires_in_seconds: number;
    readonly expiring_soon: boolean;
  };
}

export interface ParsedIngestionTokenStatusResponse {
  readonly data?: IngestionTokenStatus;
  readonly error?: string;
}

const INGESTION_TOKEN_STATUS_FIELDS = new Set(['ok', 'user', 'token']);
const INGESTION_TOKEN_STATUS_USER_FIELDS = new Set(['id', 'username', 'display_name', 'avatar_url']);
const INGESTION_TOKEN_STATUS_TOKEN_FIELDS = new Set([
  'id',
  'name',
  'created_at',
  'last_used_at',
  'expires_at',
  'expires_in_seconds',
  'expiring_soon',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function optionalStringField(value: unknown): string | null | undefined {
  if (value == null) return value;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function validDateString(value: unknown): string | null {
  const text = stringField(value);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

function optionalDateString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return validDateString(value) ?? undefined;
}

function parseIngestionTokenStatus(value: unknown): IngestionTokenStatus | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, INGESTION_TOKEN_STATUS_FIELDS)) return null;
  if (value.ok !== true) return null;

  const userValue = value.user;
  const tokenValue = value.token;
  if (
    !isRecord(userValue) ||
    !hasOnlyExpectedFields(userValue, INGESTION_TOKEN_STATUS_USER_FIELDS) ||
    !isRecord(tokenValue) ||
    !hasOnlyExpectedFields(tokenValue, INGESTION_TOKEN_STATUS_TOKEN_FIELDS)
  ) return null;

  const userId = stringField(userValue.id);
  const username = Object.hasOwn(userValue, 'username') ? optionalStringField(userValue.username) : undefined;
  const displayName = Object.hasOwn(userValue, 'display_name') ? optionalStringField(userValue.display_name) : undefined;
  const avatarUrl = Object.hasOwn(userValue, 'avatar_url') ? optionalStringField(userValue.avatar_url) : undefined;
  const tokenId = stringField(tokenValue.id);
  const tokenName = stringField(tokenValue.name);
  const createdAt = validDateString(tokenValue.created_at);
  const lastUsedAt = Object.hasOwn(tokenValue, 'last_used_at') ? optionalDateString(tokenValue.last_used_at) : undefined;
  const expiresAt = validDateString(tokenValue.expires_at);
  const expiresInSeconds = tokenValue.expires_in_seconds;
  const expiringSoon = tokenValue.expiring_soon;

  if (
    !userId ||
    (Object.hasOwn(userValue, 'username') && username === undefined) ||
    (Object.hasOwn(userValue, 'display_name') && displayName === undefined) ||
    (Object.hasOwn(userValue, 'avatar_url') && avatarUrl === undefined) ||
    !tokenId ||
    !tokenName ||
    !createdAt ||
    (Object.hasOwn(tokenValue, 'last_used_at') && lastUsedAt === undefined) ||
    !expiresAt ||
    typeof expiresInSeconds !== 'number' ||
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 0 ||
    typeof expiringSoon !== 'boolean'
  ) return null;

  return {
    ok: true,
    user: {
      id: userId,
      username: username ?? undefined,
      display_name: displayName ?? undefined,
      avatar_url: avatarUrl ?? undefined,
    },
    token: {
      id: tokenId,
      name: tokenName,
      created_at: createdAt,
      last_used_at: lastUsedAt ?? undefined,
      expires_at: expiresAt,
      expires_in_seconds: expiresInSeconds,
      expiring_soon: expiringSoon,
    },
  };
}

export async function parseCheckData(response: Response): Promise<IngestionTokenStatus | undefined> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    const parsed: unknown = await response.json();
    if (!isRecord(parsed) || !Object.hasOwn(parsed, 'data')) return undefined;
    return parseIngestionTokenStatus(parsed.data) ?? undefined;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return undefined;
    throw error;
  }
}

export async function parseIngestionTokenStatusResponse(response: Response): Promise<ParsedIngestionTokenStatusResponse> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return response.ok
      ? { error: 'AgentFeed API ingestion status response is not JSON.' }
      : { error: 'AgentFeed API ingestion status error response is not JSON.' };
  }
  try {
    const parsed: unknown = await response.json();
    if (!response.ok) {
      return { error: apiErrorResponseSummary(parsed) ?? 'AgentFeed API ingestion status error response is missing the error envelope.' };
    }
    if (!isRecord(parsed) || !Object.hasOwn(parsed, 'data')) {
      return { error: 'AgentFeed API ingestion status response is missing the data envelope.' };
    }
    if (!hasOnlyExpectedFields(parsed, DATA_RESPONSE_ENVELOPE_FIELDS)) {
      return { error: 'AgentFeed API ingestion status response has unexpected data envelope fields.' };
    }
    const data = parseIngestionTokenStatus(parsed.data);
    return data ? { data } : { error: 'AgentFeed API returned an invalid ingestion token status response.' };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return response.ok
        ? { error: 'AgentFeed API ingestion status response contains invalid JSON.' }
        : { error: 'AgentFeed API ingestion status error response contains invalid JSON.' };
    }
    throw error;
  }
}
