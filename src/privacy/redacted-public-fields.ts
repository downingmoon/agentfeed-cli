import type { AgentMetricSummary, CollectionSource, LocalDraft, WorklogMetrics, WorklogTimelineItem } from '../types.js';
import {
  METRIC_NUMBER_FIELDS,
  normalizeDraftRepositoryUrl,
  optionalNonNegativeNumberOrNull,
  optionalString,
  optionalStringArrayOrNull,
  optionalStringOrNull,
  parseAgentType,
  parseCollectionQuality,
  parseCollectionSourceType,
  parseTimelineStatus,
  requireNonNegativeInteger,
  requireRecord,
  requireString,
  requireStringArray,
  type PublicScanFields,
  type RedactedPublicPatch,
} from './redacted-public-field-primitives.js';

export type { PublicScanFields, RedactedPublicPatch } from './redacted-public-field-primitives.js';

function redactedFieldError(field: string, expected: string): Error {
  return new Error(`Invalid redacted public field ${field}: expected ${expected}.`);
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
