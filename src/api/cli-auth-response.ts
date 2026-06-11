import type { AgentFeedCredentials, CliAuthExchangeResult, CliAuthSession } from '../types.js';
import { AgentFeedApiError } from './errors.js';
import { hasOnlyExpectedFields } from './response-contract.js';
import { validateAuthorizeUrl } from './trusted-url.js';

const CLI_AUTH_SESSION_FIELDS = new Set(['session_id', 'authorize_url', 'user_code', 'expires_at', 'poll_interval_seconds']);
const CLI_AUTH_EXCHANGE_USER_FIELDS = new Set(['id', 'username', 'display_name', 'avatar_url']);
const CLI_AUTH_EXCHANGE_RESULT_FIELDS = new Set(['token', 'token_id', 'token_expires_at', 'user', 'rotated_from', 'rotated_at']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function optionalStringField(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function validOptionalDateString(value: unknown): string | null | undefined {
  const text = optionalStringField(value);
  if (text === undefined || text === null) return text;
  return Number.isFinite(Date.parse(text)) ? text : undefined;
}

function parseOptionalUser(value: unknown): AgentFeedCredentials['user'] | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !hasOnlyExpectedFields(value, CLI_AUTH_EXCHANGE_USER_FIELDS)) return null;
  const id = Object.hasOwn(value, 'id') ? optionalStringField(value.id) : undefined;
  const username = Object.hasOwn(value, 'username') ? optionalStringField(value.username) : undefined;
  const displayName = Object.hasOwn(value, 'display_name') ? optionalStringField(value.display_name) : undefined;
  const avatarUrl = Object.hasOwn(value, 'avatar_url') ? optionalStringField(value.avatar_url) : undefined;
  if (id === undefined && Object.hasOwn(value, 'id')) return null;
  if (username === undefined && Object.hasOwn(value, 'username')) return null;
  if (displayName === undefined && Object.hasOwn(value, 'display_name')) return null;
  if (avatarUrl === undefined && Object.hasOwn(value, 'avatar_url')) return null;
  const user: NonNullable<AgentFeedCredentials['user']> = {};
  if (id !== undefined && id !== null) user.id = id;
  if (username !== undefined && username !== null) user.username = username;
  if (displayName !== undefined && displayName !== null) user.display_name = displayName;
  if (avatarUrl !== undefined && avatarUrl !== null) user.avatar_url = avatarUrl;
  return user;
}

export function parseCliAuthSession(value: unknown, apiBaseUrl: string): CliAuthSession {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, CLI_AUTH_SESSION_FIELDS)) throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth session.');
  const sessionId = stringField(value.session_id);
  const authorizeUrl = stringField(value.authorize_url);
  const userCode = stringField(value.user_code);
  const expiresAt = stringField(value.expires_at);
  const pollIntervalSeconds = Number(value.poll_interval_seconds);
  if (
    !sessionId
    || !authorizeUrl
    || !userCode
    || !/^\d{3}-\d{3}$/.test(userCode)
    || !expiresAt
    || !Number.isFinite(Date.parse(expiresAt))
    || !Number.isFinite(pollIntervalSeconds)
    || pollIntervalSeconds < 1
    || pollIntervalSeconds > 60
    || !validateAuthorizeUrl(authorizeUrl, apiBaseUrl, sessionId)
  ) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth session.');
  }
  return {
    session_id: sessionId,
    authorize_url: authorizeUrl,
    user_code: userCode,
    expires_at: expiresAt,
    poll_interval_seconds: pollIntervalSeconds
  };
}

export function parseCliAuthExchangeResult(value: unknown): CliAuthExchangeResult {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, CLI_AUTH_EXCHANGE_RESULT_FIELDS)) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth exchange response.');
  }
  const token = stringField(value.token);
  const tokenId = stringField(value.token_id);
  const tokenExpiresAt = validOptionalDateString(value.token_expires_at);
  const rotatedFrom = optionalStringField(value.rotated_from);
  const rotatedAt = optionalStringField(value.rotated_at);
  const user = parseOptionalUser(value.user);
  if (
    !token
    || !tokenId
    || !tokenExpiresAt
    || (Object.hasOwn(value, 'rotated_from') && rotatedFrom === undefined)
    || (Object.hasOwn(value, 'rotated_at') && (rotatedAt === undefined || (rotatedAt !== null && !Number.isFinite(Date.parse(rotatedAt)))))
    || ((rotatedFrom === undefined || rotatedFrom === null) !== (rotatedAt === undefined || rotatedAt === null))
    || !user?.id
    || !user.display_name
  ) {
    throw new AgentFeedApiError(502, 'API_RESPONSE_INVALID', 'AgentFeed API returned an invalid CLI auth exchange response.');
  }
  return {
    token,
    token_id: tokenId,
    token_expires_at: tokenExpiresAt,
    rotated_from: rotatedFrom ?? undefined,
    rotated_at: rotatedAt ?? undefined,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    }
  };
}
