import type { AgentType, CollectionQuality, CollectionSource, LocalDraft, WorklogMetrics, WorklogTimelineItem } from '../types.js';
import { stripUrlUserInfo } from './url.js';

export type PublicScanFields = Record<string, unknown>;

export const METRIC_NUMBER_FIELDS = [
  'tokens_used',
  'estimated_cost_usd',
  'duration_seconds',
  'files_changed',
  'lines_added',
  'lines_removed',
  'tests_run',
  'tests_passed',
  'commits_created',
  'failed_commands',
  'commands_run',
  'tool_calls',
  'skills_used',
  'subagents_spawned',
  'subagents_completed',
  'agent_turns'
] as const;

export interface RedactedPublicPatch {
  title?: string;
  summary?: string;
  user_note?: string | null;
  model?: string | null;
  metrics?: WorklogMetrics;
  public_prompt?: string | null;
  outcome?: string[];
  timeline?: WorklogTimelineItem[];
  changed_areas?: string[];
  tags?: string[];
  project?: LocalDraft['project'];
}

function redactedFieldError(field: string, expected: string): Error {
  return new Error(`Invalid redacted public field ${field}: expected ${expected}.`);
}

export function normalizeDraftRepositoryUrl(value?: string | null): string | null {
  if (value === '[REDACTED_URL]') return value;
  return stripUrlUserInfo(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw redactedFieldError(field, 'an object');
  return value;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw redactedFieldError(field, 'a string');
  return value;
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

export function optionalStringOrNull(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  return requireString(value, field);
}

export function optionalNonNegativeNumberOrNull(value: unknown, field: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw redactedFieldError(field, 'a non-negative finite number or null');
  }
  return value;
}

export function optionalStringArrayOrNull(value: unknown, field: string): string[] | null | undefined {
  if (value === undefined || value === null) return value;
  return requireStringArray(value, field);
}

export function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw redactedFieldError(field, 'an array of strings');
  }
  return [...value];
}

export function parseAgentType(value: unknown, field: string): AgentType {
  switch (value) {
    case 'claude_code':
    case 'codex':
    case 'cursor':
    case 'gemini_cli':
    case 'other':
      return value;
    default:
      throw redactedFieldError(field, 'a supported agent type');
  }
}

export function parseCollectionQuality(value: unknown, field: string): CollectionQuality {
  switch (value) {
    case 'high':
    case 'medium':
    case 'low':
      return value;
    default:
      throw redactedFieldError(field, 'high, medium, or low');
  }
}

export function parseCollectionSourceType(value: unknown, field: string): CollectionSource['type'] {
  switch (value) {
    case 'agent_session':
    case 'plugin_metadata':
    case 'generic_metadata':
      return value;
    default:
      throw redactedFieldError(field, 'a supported collection source type');
  }
}

export function parseTimelineStatus(value: unknown, field: string): WorklogTimelineItem['status'] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw redactedFieldError(field, 'success, warning, failed, or info');
  switch (value) {
    case 'success':
    case 'warning':
    case 'failed':
    case 'info':
      return value;
    default:
      throw redactedFieldError(field, 'success, warning, failed, or info');
  }
}

export function requireNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw redactedFieldError(field, 'a non-negative integer');
  }
  return value;
}
