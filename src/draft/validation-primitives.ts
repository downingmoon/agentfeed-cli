import type { AgentType, CollectionQuality, CollectionSource, CollectionWindowReason, PrivacyFinding, PrivacySeverity, PrivacyStatus, WorklogCategory, WorklogTimelineItem } from '../types.js';

export function draftError(path: string, message: string): Error {
  return new Error(
    `AgentFeed draft is invalid at ${path}: ${message}. ` +
    'This usually means the local .agentfeed/drafts JSON was corrupted or hand-edited. ' +
    'Restore the draft from backup or run agentfeed collect to create a fresh draft.'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, field: string, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw draftError(path, `${field} must be an object`);
  return value;
}

export function rejectUnexpectedKeys(value: Record<string, unknown>, allowed: readonly string[], field: string, path: string): void {
  const allowedKeys = new Set(allowed);
  const unexpectedKey = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unexpectedKey !== undefined) throw draftError(path, `${field}.${unexpectedKey} is not supported by the AgentFeed API contract`);
}

export function requireString(value: unknown, field: string, path: string): string {
  if (typeof value !== 'string') throw draftError(path, `${field} must be a string`);
  return value;
}

function enforceStringMax(value: string, field: string, path: string, maxLength: number, allowEmpty = true): string {
  if (!allowEmpty && value.length === 0) throw draftError(path, `${field} must not be empty`);
  if (value.length > maxLength) throw draftError(path, `${field} must be at most ${maxLength} characters`);
  return value;
}

export function requireStringMax(value: unknown, field: string, path: string, maxLength: number, allowEmpty = true): string {
  return enforceStringMax(requireString(value, field, path), field, path, maxLength, allowEmpty);
}

export function requireBoolean(value: unknown, field: string, path: string): boolean {
  if (typeof value !== 'boolean') throw draftError(path, `${field} must be a boolean`);
  return value;
}

export function requireNumber(value: unknown, field: string, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw draftError(path, `${field} must be a finite number`);
  return value;
}

export function optionalStringOrNull(value: unknown, field: string, path: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') throw draftError(path, `${field} must be a string or null`);
  return value;
}

export function optionalStringOrNullMax(value: unknown, field: string, path: string, maxLength: number): string | null | undefined {
  const stringValue = optionalStringOrNull(value, field, path);
  if (stringValue === undefined || stringValue === null) return stringValue;
  return enforceStringMax(stringValue, field, path, maxLength);
}

export function requireTimestamp(value: unknown, field: string, path: string): string {
  const timestamp = requireString(value, field, path);
  if (!Number.isFinite(Date.parse(timestamp))) throw draftError(path, `${field} must be a valid timestamp`);
  return timestamp;
}

export function optionalTimestampOrNull(value: unknown, field: string, path: string): string | null | undefined {
  const timestamp = optionalStringOrNull(value, field, path);
  if (timestamp !== undefined && timestamp !== null && !Number.isFinite(Date.parse(timestamp))) {
    throw draftError(path, `${field} must be a valid timestamp or null`);
  }
  return timestamp;
}

export function optionalNumberOrNull(value: unknown, field: string, path: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw draftError(path, `${field} must be a finite number or null`);
  return value;
}

export function optionalNonNegativeNumberOrNull(value: unknown, field: string, path: string): number | null | undefined {
  const number = optionalNumberOrNull(value, field, path);
  if (number !== undefined && number !== null && number < 0) {
    throw draftError(path, `${field} must be a non-negative number or null`);
  }
  return number;
}

export function requireNonNegativeInteger(value: unknown, field: string, path: string): number {
  const number = requireNumber(value, field, path);
  if (!Number.isInteger(number) || number < 0) {
    throw draftError(path, `${field} must be a non-negative integer`);
  }
  return number;
}

export function requireStringArray(value: unknown, field: string, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw draftError(path, `${field} must be an array of strings`);
  }
  return [...value];
}

function enforceArrayMax<T>(items: readonly T[], field: string, path: string, maxItems: number): readonly T[] {
  if (items.length > maxItems) throw draftError(path, `${field} must contain at most ${maxItems} items`);
  return items;
}

function enforceStringItemsMax(items: readonly string[], field: string, path: string, maxLength: number): void {
  const index = items.findIndex((item) => item.length > maxLength);
  if (index !== -1) throw draftError(path, `${field}[${index}] must be at most ${maxLength} characters`);
}

function enforceStringItemsNotEmpty(items: readonly string[], field: string, path: string): void {
  const index = items.findIndex((item) => item.length === 0);
  if (index !== -1) throw draftError(path, `${field}[${index}] must not be empty`);
}

export function requireArrayMax(value: unknown, field: string, path: string, maxItems: number): unknown[] {
  if (!Array.isArray(value)) throw draftError(path, `${field} must be an array`);
  enforceArrayMax(value, field, path, maxItems);
  return [...value];
}

export function requireStringArrayMax(value: unknown, field: string, path: string, maxItems: number, itemMaxLength?: number, allowEmptyItems = true): string[] {
  const items = requireStringArray(value, field, path);
  enforceArrayMax(items, field, path, maxItems);
  if (!allowEmptyItems) enforceStringItemsNotEmpty(items, field, path);
  if (itemMaxLength !== undefined) enforceStringItemsMax(items, field, path, itemMaxLength);
  return items;
}

export function optionalStringArrayOrNull(value: unknown, field: string, path: string): string[] | null | undefined {
  if (value === undefined || value === null) return value;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw draftError(path, `${field} must be an array of strings or null`);
  }
  return [...value];
}

export function optionalStringArrayOrNullMax(value: unknown, field: string, path: string, maxItems: number, itemMaxLength?: number, allowEmptyItems = true): string[] | null | undefined {
  const items = optionalStringArrayOrNull(value, field, path);
  if (items === undefined || items === null) return items;
  enforceArrayMax(items, field, path, maxItems);
  if (!allowEmptyItems) enforceStringItemsNotEmpty(items, field, path);
  if (itemMaxLength !== undefined) enforceStringItemsMax(items, field, path, itemMaxLength);
  return items;
}

export function requireAgentType(value: unknown, field: string, path: string): AgentType {
  switch (value) {
    case 'claude_code':
    case 'codex':
    case 'cursor':
    case 'gemini_cli':
    case 'other':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireWorklogCategory(value: unknown, field: string, path: string): WorklogCategory {
  switch (value) {
    case 'web_app':
    case 'bot':
    case 'automation':
    case 'trading':
    case 'devops':
    case 'data':
    case 'ai_tool':
    case 'open_source':
    case 'other':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivateVisibility(value: unknown, field: string, path: string): 'private' {
  if (value !== 'private') throw draftError(path, `${field} has an unsupported value`);
  return value;
}

export function requirePrivacyStatus(value: unknown, field: string, path: string): PrivacyStatus {
  switch (value) {
    case 'safe':
    case 'warning':
    case 'danger':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivacySeverity(value: unknown, field: string, path: string): PrivacySeverity {
  switch (value) {
    case 'info':
    case 'low':
    case 'medium':
    case 'high':
    case 'critical':
    case 'unknown':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivacyFindingType(value: unknown, field: string, path: string): PrivacyFinding['type'] {
  switch (value) {
    case 'possible_secret':
    case 'private_url':
    case 'email_address':
    case 'api_key_pattern':
    case 'env_file_reference':
    case 'sensitive_path':
    case 'database_url':
    case 'other':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivacyResolution(value: unknown, field: string, path: string): NonNullable<PrivacyFinding['resolution']> {
  switch (value) {
    case 'ignored':
    case 'redacted':
    case 'removed':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireTimelineStatus(value: unknown, field: string, path: string): NonNullable<WorklogTimelineItem['status']> {
  switch (value) {
    case 'success':
    case 'warning':
    case 'failed':
    case 'info':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireCollectionQuality(value: unknown, field: string, path: string): CollectionQuality {
  switch (value) {
    case 'high':
    case 'medium':
    case 'low':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireCollectionSourceType(value: unknown, field: string, path: string): CollectionSource['type'] {
  switch (value) {
    case 'agent_session':
    case 'plugin_metadata':
    case 'generic_metadata':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireCollectionWindowReason(value: unknown, field: string, path: string): CollectionWindowReason {
  switch (value) {
    case 'idle_gap':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}
