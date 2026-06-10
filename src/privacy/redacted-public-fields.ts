import type { AgentMetricSummary, AgentType, CollectionQuality, CollectionSource, LocalDraft, WorklogMetrics, WorklogTimelineItem } from '../types.js';
import { stripUrlUserInfo } from './url.js';

export type PublicScanFields = Record<string, unknown>;

const METRIC_NUMBER_FIELDS = [
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

function normalizeDraftRepositoryUrl(value?: string | null): string | null {
  if (value === '[REDACTED_URL]') return value;
  return stripUrlUserInfo(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw redactedFieldError(field, 'an object');
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw redactedFieldError(field, 'a string');
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function optionalStringOrNull(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  return requireString(value, field);
}

function optionalNonNegativeNumberOrNull(value: unknown, field: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw redactedFieldError(field, 'a non-negative finite number or null');
  }
  return value;
}

function optionalStringArrayOrNull(value: unknown, field: string): string[] | null | undefined {
  if (value === undefined || value === null) return value;
  return requireStringArray(value, field);
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw redactedFieldError(field, 'an array of strings');
  }
  return [...value];
}

function parseAgentType(value: unknown, field: string): AgentType {
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

function parseCollectionQuality(value: unknown, field: string): CollectionQuality {
  switch (value) {
    case 'high':
    case 'medium':
    case 'low':
      return value;
    default:
      throw redactedFieldError(field, 'high, medium, or low');
  }
}

function parseCollectionSourceType(value: unknown, field: string): CollectionSource['type'] {
  switch (value) {
    case 'agent_session':
    case 'plugin_metadata':
    case 'generic_metadata':
      return value;
    default:
      throw redactedFieldError(field, 'a supported collection source type');
  }
}

function parseTimelineStatus(value: unknown, field: string): WorklogTimelineItem['status'] | undefined {
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

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw redactedFieldError(field, 'a non-negative integer');
  }
  return value;
}

function parseAgentMetricSummary(value: unknown, index: number): AgentMetricSummary {
  const field = `metrics.agent_metrics[${index}]`;
  const metric = requireRecord(value, field);
  const output: AgentMetricSummary = { agent: parseAgentType(metric.agent, `${field}.agent`) };
  const model = optionalStringOrNull(metric.model, `${field}.model`);
  if (model !== undefined) output.model = model;
  const sessionId = optionalStringOrNull(metric.session_id, `${field}.session_id`);
  if (sessionId !== undefined) output.session_id = sessionId;
  for (const key of METRIC_NUMBER_FIELDS) {
    if (key === 'commits_created') continue;
    const normalized = optionalNonNegativeNumberOrNull(metric[key], `${field}.${key}`);
    if (normalized !== undefined) output[key] = normalized;
  }
  const agentModes = optionalStringArrayOrNull(metric.agent_modes, `${field}.agent_modes`);
  if (agentModes !== undefined) output.agent_modes = agentModes;
  return output;
}

function parseCollectionSource(value: unknown, index: number): CollectionSource {
  const field = `metrics.collection_sources[${index}]`;
  const source = requireRecord(value, field);
  return {
    type: parseCollectionSourceType(source.type, `${field}.type`),
    name: requireString(source.name, `${field}.name`),
    quality: parseCollectionQuality(source.quality, `${field}.quality`),
  };
}

function parseMetrics(value: unknown): WorklogMetrics | undefined {
  if (value === undefined) return undefined;
  const metrics = requireRecord(value, 'metrics');
  const output: WorklogMetrics = {};
  for (const key of METRIC_NUMBER_FIELDS) {
    const normalized = optionalNonNegativeNumberOrNull(metrics[key], `metrics.${key}`);
    if (normalized !== undefined) output[key] = normalized;
  }
  const modelsUsed = optionalStringArrayOrNull(metrics.models_used, 'metrics.models_used');
  if (modelsUsed !== undefined) output.models_used = modelsUsed;
  const agentModes = optionalStringArrayOrNull(metrics.agent_modes, 'metrics.agent_modes');
  if (agentModes !== undefined) output.agent_modes = agentModes;
  if (metrics.agent_metrics !== undefined && metrics.agent_metrics !== null) {
    if (!Array.isArray(metrics.agent_metrics)) throw redactedFieldError('metrics.agent_metrics', 'an array or null');
    output.agent_metrics = metrics.agent_metrics.map((item, index) => parseAgentMetricSummary(item, index));
  } else if (metrics.agent_metrics === null) {
    output.agent_metrics = null;
  }
  if (metrics.collection_quality !== undefined && metrics.collection_quality !== null) {
    output.collection_quality = parseCollectionQuality(metrics.collection_quality, 'metrics.collection_quality');
  } else if (metrics.collection_quality === null) {
    output.collection_quality = null;
  }
  if (metrics.collection_sources !== undefined && metrics.collection_sources !== null) {
    if (!Array.isArray(metrics.collection_sources)) throw redactedFieldError('metrics.collection_sources', 'an array or null');
    output.collection_sources = metrics.collection_sources.map((item, index) => parseCollectionSource(item, index));
  } else if (metrics.collection_sources === null) {
    output.collection_sources = null;
  }
  return output;
}

function parseTimeline(value: unknown): WorklogTimelineItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw redactedFieldError('timeline', 'an array of timeline items');
  return value.map((item, index): WorklogTimelineItem => {
    const field = `timeline[${index}]`;
    const row = requireRecord(item, field);
    const status = parseTimelineStatus(row.status, `${field}.status`);
    return {
      order: requireNonNegativeInteger(row.order, `${field}.order`),
      title: requireString(row.title, `${field}.title`),
      ...(row.description === undefined ? {} : { description: requireString(row.description, `${field}.description`) }),
      ...(status === undefined ? {} : { status }),
    };
  });
}

function parseProject(value: unknown): LocalDraft['project'] | undefined {
  if (value === undefined) return undefined;
  const project = requireRecord(value, 'project');
  const localPathHash = optionalString(project.local_path_hash, 'project.local_path_hash');
  return {
    name: requireString(project.name, 'project.name'),
    repository_url: normalizeDraftRepositoryUrl(optionalStringOrNull(project.repository_url, 'project.repository_url') ?? null),
    ...(localPathHash === undefined ? {} : { local_path_hash: localPathHash }),
  };
}

export function parseRedactedPatch(redacted: PublicScanFields): RedactedPublicPatch {
  const patch: RedactedPublicPatch = {};
  const title = optionalString(redacted.title, 'title');
  if (title !== undefined) patch.title = title;
  const summary = optionalString(redacted.summary, 'summary');
  if (summary !== undefined) patch.summary = summary;
  const userNote = optionalStringOrNull(redacted.user_note, 'user_note');
  if (userNote !== undefined) patch.user_note = userNote;
  const model = optionalStringOrNull(redacted.model, 'model');
  if (model !== undefined) patch.model = model;
  const metrics = parseMetrics(redacted.metrics);
  if (metrics !== undefined) patch.metrics = metrics;
  const publicPrompt = optionalStringOrNull(redacted.public_prompt, 'public_prompt');
  if (publicPrompt !== undefined) patch.public_prompt = publicPrompt;
  const outcome = redacted.outcome === undefined ? undefined : requireStringArray(redacted.outcome, 'outcome');
  if (outcome !== undefined) patch.outcome = outcome;
  const timeline = parseTimeline(redacted.timeline);
  if (timeline !== undefined) patch.timeline = timeline;
  const changedAreas = redacted.changed_areas === undefined ? undefined : requireStringArray(redacted.changed_areas, 'changed_areas');
  if (changedAreas !== undefined) patch.changed_areas = changedAreas;
  const tags = redacted.tags === undefined ? undefined : requireStringArray(redacted.tags, 'tags');
  if (tags !== undefined) patch.tags = tags;
  const project = parseProject(redacted.project);
  if (project !== undefined) patch.project = project;
  return patch;
}
