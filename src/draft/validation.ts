import type { AgentMetricSummary, AgentType, CollectionQuality, CollectionSource, CollectionWindow, CollectionWindowReason, LocalDraft, PrivacyFinding, PrivacyScanResult, PrivacySeverity, PrivacyStatus, ReviewUrlHandoffChannel, WorklogCategory, WorklogMetrics, WorklogTimelineItem } from '../types.js';

import { draftError, optionalNonNegativeNumberOrNull, optionalStringArrayOrNull, optionalStringOrNull, optionalTimestampOrNull, requireAgentType, requireBoolean, requireCollectionQuality, requireCollectionSourceType, requireCollectionWindowReason, requireNonNegativeInteger, requirePrivacyFindingType, requirePrivacyResolution, requirePrivacySeverity, requirePrivacyStatus, requirePrivateVisibility, requireRecord, requireString, requireStringArray, requireTimestamp, requireTimelineStatus, requireWorklogCategory } from './validation-primitives.js';

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
    agent: requireAgentType(metric.agent, `${field}.agent`, path),
  };
  const model = optionalStringOrNull(metric.model, `${field}.model`, path);
  if (model !== undefined) output.model = model;
  const sessionId = optionalStringOrNull(metric.session_id, `${field}.session_id`, path);
  if (sessionId !== undefined) output.session_id = sessionId;
  for (const key of ['tokens_used', 'estimated_cost_usd', 'duration_seconds', 'files_changed', 'lines_added', 'lines_removed', 'tests_run', 'tests_passed', 'failed_commands', 'commands_run', 'tool_calls', 'skills_used', 'subagents_spawned', 'subagents_completed', 'agent_turns'] as const) {
    const normalized = optionalNonNegativeNumberOrNull(metric[key], `${field}.${key}`, path);
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
    const normalized = optionalNonNegativeNumberOrNull(metrics[field], `worklog.metrics.${field}`, path);
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
    output.collection_quality = requireCollectionQuality(metrics.collection_quality, 'worklog.metrics.collection_quality', path);
  } else if (metrics.collection_quality === null) {
    output.collection_quality = null;
  }
  if (metrics.collection_sources !== undefined && metrics.collection_sources !== null) {
    if (!Array.isArray(metrics.collection_sources)) throw draftError(path, 'worklog.metrics.collection_sources must be an array or null');
    output.collection_sources = metrics.collection_sources.map((item, index): CollectionSource => {
      const source = requireRecord(item, `worklog.metrics.collection_sources[${index}]`, path);
      return {
        type: requireCollectionSourceType(source.type, `worklog.metrics.collection_sources[${index}].type`, path),
        name: requireString(source.name, `worklog.metrics.collection_sources[${index}].name`, path),
        quality: requireCollectionQuality(source.quality, `worklog.metrics.collection_sources[${index}].quality`, path),
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
    const status = row.status === undefined ? undefined : requireTimelineStatus(row.status, `worklog.timeline[${index}].status`, path);
    return {
      order: requireNonNegativeInteger(row.order, `worklog.timeline[${index}].order`, path),
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
    status: requirePrivacyStatus(scan.status, 'privacy_scan.status', path),
    findings: scan.findings.map((item, index): PrivacyFinding => {
      const finding = requireRecord(item, `privacy_scan.findings[${index}]`, path);
      const resolution = finding.resolution === undefined
        ? undefined
        : requirePrivacyResolution(finding.resolution, `privacy_scan.findings[${index}].resolution`, path);
      return {
        id: requireString(finding.id, `privacy_scan.findings[${index}].id`, path),
        type: requirePrivacyFindingType(finding.type, `privacy_scan.findings[${index}].type`, path),
        severity: requirePrivacySeverity(finding.severity, `privacy_scan.findings[${index}].severity`, path),
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

  const id = requireString(root.id, 'id', path);
  const repositoryUrl = optionalStringOrNull(project.repository_url, 'project.repository_url', path);
  const localPathHash = project.local_path_hash === undefined ? undefined : requireString(project.local_path_hash, 'project.local_path_hash', path);

  const userNote = optionalStringOrNull(worklog.user_note, 'worklog.user_note', path);
  const model = optionalStringOrNull(worklog.model, 'worklog.model', path);
  const publicPrompt = optionalStringOrNull(worklog.public_prompt, 'worklog.public_prompt', path);

  const sessionId = optionalStringOrNull(source.session_id, 'source.session_id', path);
  const hostLabel = optionalStringOrNull(source.host_label, 'source.host_label', path);
  const sourceCollectionWindow = validateCollectionWindow(source.collection_window, 'source.collection_window', path);
  const collectionWindowReason = source.collection_window_reason === undefined || source.collection_window_reason === null
    ? source.collection_window_reason
    : requireCollectionWindowReason(source.collection_window_reason, 'source.collection_window_reason', path);
  const collectionFingerprint = optionalStringOrNull(source.collection_fingerprint, 'source.collection_fingerprint', path);

  const worklogId = optionalStringOrNull(upload.worklog_id, 'upload.worklog_id', path);
  const reviewUrl = optionalStringOrNull(upload.review_url, 'upload.review_url', path);
  const uploadedAt = optionalTimestampOrNull(upload.uploaded_at, 'upload.uploaded_at', path);
  const payloadHash = optionalStringOrNull(upload.payload_hash, 'upload.payload_hash', path);
  const apiBaseUrl = optionalStringOrNull(upload.api_base_url, 'upload.api_base_url', path);
  const reviewBaseUrl = optionalStringOrNull(upload.review_base_url, 'upload.review_base_url', path);
  const credentialBindingHash = optionalStringOrNull(upload.credential_binding_hash, 'upload.credential_binding_hash', path);
  const tokenId = optionalStringOrNull(upload.token_id, 'upload.token_id', path);
  const userId = optionalStringOrNull(upload.user_id, 'upload.user_id', path);
  const handoff = validateHandoff(upload.handoff, path);

  return {
    schema_version: '0.2',
    id,
    project: {
      name: requireString(project.name, 'project.name', path),
      ...(repositoryUrl === undefined ? {} : { repository_url: repositoryUrl }),
      ...(localPathHash === undefined ? {} : { local_path_hash: localPathHash }),
    },
    worklog: {
      title: requireString(worklog.title, 'worklog.title', path),
      summary: requireString(worklog.summary, 'worklog.summary', path),
      ...(userNote === undefined ? {} : { user_note: userNote }),
      agent: requireAgentType(worklog.agent, 'worklog.agent', path),
      ...(model === undefined ? {} : { model }),
      category: requireWorklogCategory(worklog.category, 'worklog.category', path),
      tags: requireStringArray(worklog.tags, 'worklog.tags', path),
      visibility: requirePrivateVisibility(worklog.visibility, 'worklog.visibility', path),
      metrics: validateMetrics(worklog.metrics, path),
      changed_areas: requireStringArray(worklog.changed_areas, 'worklog.changed_areas', path),
      ...(publicPrompt === undefined ? {} : { public_prompt: publicPrompt }),
      outcome: requireStringArray(worklog.outcome, 'worklog.outcome', path),
      timeline: validateTimeline(worklog.timeline, path),
    },
    privacy_scan: validatePrivacyScan(root.privacy_scan, path),
    source: {
      agent: requireAgentType(source.agent, 'source.agent', path),
      ...(sessionId === undefined ? {} : { session_id: sessionId }),
      tool_version: requireString(source.tool_version, 'source.tool_version', path),
      ...(hostLabel === undefined ? {} : { host_label: hostLabel }),
      created_at: requireTimestamp(source.created_at, 'source.created_at', path),
      ...(sourceCollectionWindow === undefined ? {} : { collection_window: sourceCollectionWindow }),
      ...(collectionWindowReason === undefined ? {} : { collection_window_reason: collectionWindowReason }),
      ...(collectionFingerprint === undefined ? {} : { collection_fingerprint: collectionFingerprint }),
    },
    upload: {
      uploaded: requireBoolean(upload.uploaded, 'upload.uploaded', path),
      ...(worklogId === undefined ? {} : { worklog_id: worklogId }),
      ...(reviewUrl === undefined ? {} : { review_url: reviewUrl }),
      ...(uploadedAt === undefined ? {} : { uploaded_at: uploadedAt }),
      ...(payloadHash === undefined ? {} : { payload_hash: payloadHash }),
      ...(apiBaseUrl === undefined ? {} : { api_base_url: apiBaseUrl }),
      ...(reviewBaseUrl === undefined ? {} : { review_base_url: reviewBaseUrl }),
      ...(credentialBindingHash === undefined ? {} : { credential_binding_hash: credentialBindingHash }),
      ...(tokenId === undefined ? {} : { token_id: tokenId }),
      ...(userId === undefined ? {} : { user_id: userId }),
      ...(handoff === undefined ? {} : { handoff }),
    },
  };
}
