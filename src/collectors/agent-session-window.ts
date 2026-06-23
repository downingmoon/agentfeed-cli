import type { CollectionWindow } from '../types.js';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim().replace(/^\$/, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function parseIsoMillis(value: unknown): number | null {
  const text = asString(value);
  if (!text) return null;
  const millis = Date.parse(text);
  return Number.isFinite(millis) ? millis : null;
}

function parseTimestampMillis(value: unknown): number | null {
  const isoMillis = parseIsoMillis(value);
  if (isoMillis != null) return isoMillis;
  const n = finiteNumber(value);
  if (n == null || n <= 0) return null;
  if (n > 1_000_000_000_000) return n;
  if (n > 1_000_000_000) return n * 1000;
  return null;
}

export function parseBoundaryMillis(value?: string | null): number | null {
  if (!value) return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`Invalid collection window timestamp: ${value}`);
  return millis;
}

export function rowTimestampMillis(row: Record<string, unknown>): number | null {
  return parseTimestampMillis(row.timestamp)
    ?? parseTimestampMillis(row.created_at)
    ?? parseTimestampMillis(row.createdAt)
    ?? parseTimestampMillis(row.updated_at)
    ?? parseTimestampMillis(row.updatedAt)
    ?? parseTimestampMillis(row.lastUpdated)
    ?? parseTimestampMillis(row.startTime)
    ?? parseTimestampMillis(row.time)
    ?? parseTimestampMillis(row.ts);
}

export function rowInCollectionWindow(row: Record<string, unknown>, window?: CollectionWindow | null, options: { readonly includeMissingTimestamp?: boolean } = {}): boolean {
  const sinceMillis = parseBoundaryMillis(window?.since);
  const untilMillis = parseBoundaryMillis(window?.until);
  if (sinceMillis == null && untilMillis == null) return true;
  const millis = rowTimestampMillis(row);
  if (millis == null) return options.includeMissingTimestamp ?? true;
  if (sinceMillis != null && millis < sinceMillis) return false;
  if (untilMillis != null && millis > untilMillis) return false;
  return true;
}

export function hasCollectionWindowBoundary(window?: CollectionWindow | null): boolean {
  return Boolean(window?.since || window?.until);
}

export function rowInAgentCollectionWindow(row: Record<string, unknown>, window?: CollectionWindow | null): boolean {
  return rowInCollectionWindow(row, window, { includeMissingTimestamp: !hasCollectionWindowBoundary(window) });
}

export function normalizedCollectionWindow(window?: CollectionWindow | null): CollectionWindow | null {
  const since = window?.since ?? null;
  const until = window?.until ?? null;
  return since || until ? { since, until } : null;
}
