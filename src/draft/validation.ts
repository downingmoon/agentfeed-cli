import type { AgentMetricSummary, AgentType, CollectionQuality, CollectionSource, CollectionWindow, CollectionWindowReason, LocalDraft, PrivacyFinding, PrivacyScanResult, PrivacySeverity, PrivacyStatus, ReviewUrlHandoffChannel, WorklogCategory, WorklogMetrics, WorklogTimelineItem } from '../types.js';

const AGENT_TYPES = new Set(['claude_code', 'codex', 'cursor', 'gemini_cli', 'other']);
const WORKLOG_CATEGORIES = new Set(['web_app', 'bot', 'automation', 'trading', 'devops', 'data', 'ai_tool', 'open_source', 'other']);
const PRIVACY_STATUSES = new Set(['safe', 'warning', 'danger']);
const PRIVACY_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical', 'unknown']);
const PRIVACY_FINDING_TYPES = new Set(['possible_secret', 'private_url', 'email_address', 'api_key_pattern', 'env_file_reference', 'sensitive_path', 'database_url', 'other']);
const PRIVACY_RESOLUTIONS = new Set(['ignored', 'redacted', 'removed']);
const TIMELINE_STATUSES = new Set(['success', 'warning', 'failed', 'info']);
const COLLECTION_QUALITIES = new Set(['high', 'medium', 'low']);
const COLLECTION_SOURCE_TYPES = new Set(['agent_session', 'plugin_metadata', 'generic_metadata']);
const COLLECTION_WINDOW_REASONS = new Set(['idle_gap']);

function draftError(path: string, message: string): Error {
  return new Error(
    `AgentFeed draft is invalid at ${path}: ${message}. ` +
    'This usually means the local .agentfeed/drafts JSON was corrupted or hand-edited. ' +
    'Restore the draft from backup or run agentfeed collect to create a fresh draft.'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw draftError(path, `${field} must be an object`);
  return value;
}

function requireString(value: unknown, field: string, path: string): string {
  if (typeof value !== 'string') throw draftError(path, `${field} must be a string`);
  return value;
}

function requireBoolean(value: unknown, field: string, path: string): boolean {
  if (typeof value !== 'boolean') throw draftError(path, `${field} must be a boolean`);
  return value;
}

function requireNumber(value: unknown, field: string, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw draftError(path, `${field} must be a finite number`);
  return value;
}

function optionalStringOrNull(value: unknown, field: string, path: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') throw draftError(path, `${field} must be a string or null`);
  return value;
}

function requireTimestamp(value: unknown, field: string, path: string): string {
  const timestamp = requireString(value, field, path);
  if (!Number.isFinite(Date.parse(timestamp))) throw draftError(path, `${field} must be a valid timestamp`);
  return timestamp;
}

function optionalTimestampOrNull(value: unknown, field: string, path: string): string | null | undefined {
  const timestamp = optionalStringOrNull(value, field, path);
  if (timestamp !== undefined && timestamp !== null && !Number.isFinite(Date.parse(timestamp))) {
    throw draftError(path, `${field} must be a valid timestamp or null`);
  }
  return timestamp;
}

function optionalNumberOrNull(value: unknown, field: string, path: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw draftError(path, `${field} must be a finite number or null`);
  return value;
}

function requireStringArray(value: unknown, field: string, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw draftError(path, `${field} must be an array of strings`);
  }
  return [...value];
}

function requireEnum<T extends string>(value: unknown, field: string, values: Set<string>, path: string): T {
  if (typeof value !== 'string' || !values.has(value)) {
    throw draftError(path, `${field} has an unsupported value`);
  }
  return value as T;
}

function optionalStringArrayOrNull(value: unknown, field: string, path: string): string[] | null | undefined {
  if (value === undefined || value === null) return value;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw draftError(path, `${field} must be an array of strings or null`);
  }
  return [...value];
}

function validateCollectionWindow(value: unknown, field: string, path: string): CollectionWindow | null | undefined {
  if (value === undefined || value === null) return value;
  const window = requireRecord(value, field, path);
  return {
    since: optionalTimestampOrNull(window.since, `${field}.since`, path) ?? null,
    until: optionalTimestampOrNull(window.until, `${field}.until`, path) ?? null,
  };
}

function validateAgentMetricSummary(value: unknown, index: number, path: string): AgentMetricSummary {
  const field = `worklog.metrics.agent_metrics[${index}]`;
  const metric = requireRecord(value, field, path);
  const output: AgentMetricSummary = {
    agent: requireEnum<AgentType>(metric.agent, `${field}.agent`, AGENT_TYPES, path),
  };
  const model = optionalStringOrNull(metric.model, `${field}.model`, path);
  if (model !== undefined) output.model = model;
  const sessionId = optionalStringOrNull(metric.session_id, `${field}.session_id`, path);
  if (sessionId !== undefined) output.session_id = sessionId;
  for (const key of ['tokens_used', 'estimated_cost_usd', 'duration_seconds', 'files_changed', 'lines_added', 'lines_removed', 'tests_run', 'tests_passed', 'failed_commands', 'commands_run', 'tool_calls', 'skills_used', 'subagents_spawned', 'subagents_completed', 'agent_turns'] as const) {
    const normalized = optionalNumberOrNull(metric[key], `${field}.${key}`, path);
    if (normalized !== undefined) output[key] = normalized;
  }
  const agentModes = optionalStringArrayOrNull(metric.agent_modes, `${field}.agent_modes`, path);
  if (agentModes !== undefined) output.agent_modes = agentModes;
  return output;
}

function validateMetrics(value: unknown, path: string): WorklogMetrics {
  const metrics = requireRecord(value, 'worklog.metrics', path);
  const output: WorklogMetrics = {};
  for (const field of ['tokens_used', 'estimated_cost_usd', 'duration_seconds', 'files_changed', 'lines_added', 'lines_removed', 'tests_run', 'tests_passed', 'commits_created', 'failed_commands', 'commands_run', 'tool_calls', 'skills_used', 'subagents_spawned', 'subagents_completed', 'agent_turns'] as const) {
    const normalized = optionalNumberOrNull(metrics[field], `worklog.metrics.${field}`, path);
    if (normalized !== undefined) output[field] = normalized;
  }
  const modelsUsed = optionalStringArrayOrNull(metrics.models_used, 'worklog.metrics.models_used', path);
  if (modelsUsed !== undefined) output.models_used = modelsUsed;
  if (metrics.agent_metrics !== undefined && metrics.agent_metrics !== null) {
    if (!Array.isArray(metrics.agent_metrics)) throw draftError(path, 'worklog.metrics.agent_metrics must be an array or null');
    output.agent_metrics = metrics.agent_metrics.map((item, index) => validateAgentMetricSummary(item, index, path));
  } else if (metrics.agent_metrics === null) {
    output.agent_metrics = null;
  }
  const agentModes = optionalStringArrayOrNull(metrics.agent_modes, 'worklog.metrics.agent_modes', path);
  if (agentModes !== undefined) output.agent_modes = agentModes;
  if (metrics.collection_quality !== undefined && metrics.collection_quality !== null) {
    output.collection_quality = requireEnum<CollectionQuality>(metrics.collection_quality, 'worklog.metrics.collection_quality', COLLECTION_QUALITIES, path);
  } else if (metrics.collection_quality === null) {
    output.collection_quality = null;
  }
  if (metrics.collection_sources !== undefined && metrics.collection_sources !== null) {
    if (!Array.isArray(metrics.collection_sources)) throw draftError(path, 'worklog.metrics.collection_sources must be an array or null');
    output.collection_sources = metrics.collection_sources.map((item, index): CollectionSource => {
      const source = requireRecord(item, `worklog.metrics.collection_sources[${index}]`, path);
      return {
        type: requireEnum<CollectionSource['type']>(source.type, `worklog.metrics.collection_sources[${index}].type`, COLLECTION_SOURCE_TYPES, path),
        name: requireString(source.name, `worklog.metrics.collection_sources[${index}].name`, path),
        quality: requireEnum<CollectionQuality>(source.quality, `worklog.metrics.collection_sources[${index}].quality`, COLLECTION_QUALITIES, path),
      };
    });
  } else if (metrics.collection_sources === null) {
    output.collection_sources = null;
  }
  return output;
}

function validateTimeline(value: unknown, path: string): WorklogTimelineItem[] {
  if (!Array.isArray(value)) throw draftError(path, 'worklog.timeline must be an array');
  return value.map((item, index): WorklogTimelineItem => {
    const row = requireRecord(item, `worklog.timeline[${index}]`, path);
    const status = row.status === undefined ? undefined : requireEnum<NonNullable<WorklogTimelineItem['status']>>(row.status, `worklog.timeline[${index}].status`, TIMELINE_STATUSES, path);
    return {
      order: requireNumber(row.order, `worklog.timeline[${index}].order`, path),
      title: requireString(row.title, `worklog.timeline[${index}].title`, path),
      ...(row.description === undefined ? {} : { description: requireString(row.description, `worklog.timeline[${index}].description`, path) }),
      ...(status === undefined ? {} : { status }),
    };
  });
}


function validateHandoffChannel(value: unknown, field: string, path: string): ReviewUrlHandoffChannel {
  const channel = requireRecord(value, field, path);
  const warning = channel.warning === undefined ? undefined : requireString(channel.warning, `${field}.warning`, path);
  return {
    requested: requireBoolean(channel.requested, `${field}.requested`, path),
    ok: channel.ok === null ? null : requireBoolean(channel.ok, `${field}.ok`, path),
    ...(warning === undefined ? {} : { warning }),
  };
}

function validateHandoff(value: unknown, path: string): LocalDraft['upload']['handoff'] | null | undefined {
  if (value === undefined || value === null) return value;
  const handoff = requireRecord(value, 'upload.handoff', path);
  return {
    clipboard: validateHandoffChannel(handoff.clipboard, 'upload.handoff.clipboard', path),
    browser: validateHandoffChannel(handoff.browser, 'upload.handoff.browser', path),
  };
}

function validatePrivacyScan(value: unknown, path: string): PrivacyScanResult {
  const scan = requireRecord(value, 'privacy_scan', path);
  if (!Array.isArray(scan.findings)) throw draftError(path, 'privacy_scan.findings must be an array');
  return {
    status: requireEnum<PrivacyStatus>(scan.status, 'privacy_scan.status', PRIVACY_STATUSES, path),
    findings: scan.findings.map((item, index): PrivacyFinding => {
      const finding = requireRecord(item, `privacy_scan.findings[${index}]`, path);
      const resolution = finding.resolution === undefined
        ? undefined
        : requireEnum<NonNullable<PrivacyFinding['resolution']>>(finding.resolution, `privacy_scan.findings[${index}].resolution`, PRIVACY_RESOLUTIONS, path);
      return {
        id: requireString(finding.id, `privacy_scan.findings[${index}].id`, path),
        type: requireEnum<PrivacyFinding['type']>(finding.type, `privacy_scan.findings[${index}].type`, PRIVACY_FINDING_TYPES, path),
        severity: requireEnum<PrivacySeverity>(finding.severity, `privacy_scan.findings[${index}].severity`, PRIVACY_SEVERITIES, path),
        message: requireString(finding.message, `privacy_scan.findings[${index}].message`, path),
        ...(finding.field === undefined ? {} : { field: requireString(finding.field, `privacy_scan.findings[${index}].field`, path) }),
        ...(finding.sample_redacted === undefined ? {} : { sample_redacted: requireString(finding.sample_redacted, `privacy_scan.findings[${index}].sample_redacted`, path) }),
        resolved: requireBoolean(finding.resolved, `privacy_scan.findings[${index}].resolved`, path),
        ...(resolution === undefined ? {} : { resolution }),
      };
    }),
  };
}

export function validateLocalDraft(value: unknown, path: string): LocalDraft {
  const root = requireRecord(value, 'root', path);
  if (root.schema_version !== '0.2') throw draftError(path, 'schema_version must be "0.2"');

  const project = requireRecord(root.project, 'project', path);
  const worklog = requireRecord(root.worklog, 'worklog', path);
  const source = requireRecord(root.source, 'source', path);
  const upload = requireRecord(root.upload, 'upload', path);

  requireString(root.id, 'id', path);

  requireString(project.name, 'project.name', path);
  optionalStringOrNull(project.repository_url, 'project.repository_url', path);
  if (project.local_path_hash !== undefined) requireString(project.local_path_hash, 'project.local_path_hash', path);

  requireString(worklog.title, 'worklog.title', path);
  requireString(worklog.summary, 'worklog.summary', path);
  optionalStringOrNull(worklog.user_note, 'worklog.user_note', path);
  requireEnum<AgentType>(worklog.agent, 'worklog.agent', AGENT_TYPES, path);
  optionalStringOrNull(worklog.model, 'worklog.model', path);
  requireEnum<WorklogCategory>(worklog.category, 'worklog.category', WORKLOG_CATEGORIES, path);
  requireStringArray(worklog.tags, 'worklog.tags', path);
  requireEnum<'private'>(worklog.visibility, 'worklog.visibility', new Set(['private']), path);
  validateMetrics(worklog.metrics, path);
  requireStringArray(worklog.changed_areas, 'worklog.changed_areas', path);
  optionalStringOrNull(worklog.public_prompt, 'worklog.public_prompt', path);
  requireStringArray(worklog.outcome, 'worklog.outcome', path);
  validateTimeline(worklog.timeline, path);

  validatePrivacyScan(root.privacy_scan, path);

  requireEnum<AgentType>(source.agent, 'source.agent', AGENT_TYPES, path);
  optionalStringOrNull(source.session_id, 'source.session_id', path);
  requireString(source.tool_version, 'source.tool_version', path);
  optionalStringOrNull(source.host_label, 'source.host_label', path);
  requireTimestamp(source.created_at, 'source.created_at', path);
  validateCollectionWindow(source.collection_window, 'source.collection_window', path);
  if (source.collection_window_reason !== undefined && source.collection_window_reason !== null) {
    requireEnum<CollectionWindowReason>(source.collection_window_reason, 'source.collection_window_reason', COLLECTION_WINDOW_REASONS, path);
  }
  optionalStringOrNull(source.collection_fingerprint, 'source.collection_fingerprint', path);

  requireBoolean(upload.uploaded, 'upload.uploaded', path);
  optionalStringOrNull(upload.worklog_id, 'upload.worklog_id', path);
  optionalStringOrNull(upload.review_url, 'upload.review_url', path);
  optionalTimestampOrNull(upload.uploaded_at, 'upload.uploaded_at', path);
  optionalStringOrNull(upload.payload_hash, 'upload.payload_hash', path);
  optionalStringOrNull(upload.api_base_url, 'upload.api_base_url', path);
  optionalStringOrNull(upload.review_base_url, 'upload.review_base_url', path);
  optionalStringOrNull(upload.credential_binding_hash, 'upload.credential_binding_hash', path);
  optionalStringOrNull(upload.token_id, 'upload.token_id', path);
  optionalStringOrNull(upload.user_id, 'upload.user_id', path);
  validateHandoff(upload.handoff, path);

  return root as unknown as LocalDraft;
}
