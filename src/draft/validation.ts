import type { AgentMetricSummary, AgentType, CollectionQuality, CollectionSource, CollectionWindow, CollectionWindowReason, LocalDraft, PrivacyFinding, PrivacyScanResult, PrivacySeverity, PrivacyStatus, ReviewUrlHandoffChannel, WorklogCategory, WorklogMetrics, WorklogTimelineItem } from '../types.js';

import { draftError, optionalNonNegativeNumberOrNull, optionalStringArrayOrNullMax, optionalStringOrNull, optionalStringOrNullMax, optionalTimestampOrNull, requireAgentType, requireArrayMax, requireBoolean, requireCollectionQuality, requireCollectionSourceType, requireCollectionWindowReason, requireNonNegativeInteger, requirePrivacyFindingType, requirePrivacyResolution, requirePrivacySeverity, requirePrivacyStatus, requirePrivateVisibility, requireRecord, requireString, requireStringArrayMax, requireStringMax, requireTimestamp, requireTimelineStatus, requireWorklogCategory } from './validation-primitives.js';

const PROJECT_NAME_MAX_LENGTH = 100;
const SOURCE_TOOL_VERSION_MAX_LENGTH = 100;
const SOURCE_HOST_LABEL_MAX_LENGTH = 100;
const SOURCE_SESSION_ID_MAX_LENGTH = 200;
const SOURCE_COLLECTION_FINGERPRINT_MAX_LENGTH = 200;
const WORKLOG_TITLE_MAX_LENGTH = 200;
const WORKLOG_SUMMARY_MAX_LENGTH = 8000;
const WORKLOG_USER_NOTE_MAX_LENGTH = 4000;
const WORKLOG_MODEL_MAX_LENGTH = 100;
const WORKLOG_TAGS_MAX_ITEMS = 20;
const WORKLOG_TAG_MAX_LENGTH = 50;
const WORKLOG_CHANGED_AREAS_MAX_ITEMS = 50;
const WORKLOG_CHANGED_AREA_MAX_LENGTH = 240;
const WORKLOG_PUBLIC_PROMPT_MAX_LENGTH = 12000;
const WORKLOG_OUTCOME_MAX_ITEMS = 50;
const WORKLOG_TIMELINE_MAX_ITEMS = 100;
const WORKLOG_TIMELINE_TITLE_MAX_LENGTH = 200;
const WORKLOG_TIMELINE_DESCRIPTION_MAX_LENGTH = 1000;
const WORKLOG_METRIC_COLLECTION_MAX_ITEMS = 20;
const PRIVACY_FINDINGS_MAX_ITEMS = 50;
const PRIVACY_FINDING_ID_MAX_LENGTH = 100;
const PRIVACY_FINDING_FIELD_MAX_LENGTH = 100;
const PRIVACY_FINDING_MESSAGE_MAX_LENGTH = 2000;

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
  const model = optionalStringOrNullMax(metric.model, `${field}.model`, path, WORKLOG_MODEL_MAX_LENGTH);
  if (model !== undefined) output.model = model;
  const sessionId = optionalStringOrNullMax(metric.session_id, `${field}.session_id`, path, SOURCE_SESSION_ID_MAX_LENGTH);
  if (sessionId !== undefined) output.session_id = sessionId;
  for (const key of ['tokens_used', 'estimated_cost_usd', 'duration_seconds', 'files_changed', 'lines_added', 'lines_removed', 'tests_run', 'tests_passed', 'failed_commands', 'commands_run', 'tool_calls', 'skills_used', 'subagents_spawned', 'subagents_completed', 'agent_turns'] as const) {
    const normalized = optionalNonNegativeNumberOrNull(metric[key], `${field}.${key}`, path);
    if (normalized !== undefined) output[key] = normalized;
  }
  const agentModes = optionalStringArrayOrNullMax(metric.agent_modes, `${field}.agent_modes`, path, WORKLOG_METRIC_COLLECTION_MAX_ITEMS);
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
  const modelsUsed = optionalStringArrayOrNullMax(metrics.models_used, 'worklog.metrics.models_used', path, WORKLOG_METRIC_COLLECTION_MAX_ITEMS, WORKLOG_MODEL_MAX_LENGTH);
  if (modelsUsed !== undefined) output.models_used = modelsUsed;
  if (metrics.agent_metrics !== undefined && metrics.agent_metrics !== null) {
    output.agent_metrics = requireArrayMax(metrics.agent_metrics, 'worklog.metrics.agent_metrics', path, WORKLOG_METRIC_COLLECTION_MAX_ITEMS).map((item, index) => validateAgentMetricSummary(item, index, path));
  } else if (metrics.agent_metrics === null) {
    output.agent_metrics = null;
  }
  const agentModes = optionalStringArrayOrNullMax(metrics.agent_modes, 'worklog.metrics.agent_modes', path, WORKLOG_METRIC_COLLECTION_MAX_ITEMS);
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
  return requireArrayMax(value, 'worklog.timeline', path, WORKLOG_TIMELINE_MAX_ITEMS).map((item, index): WorklogTimelineItem => {
    const row = requireRecord(item, `worklog.timeline[${index}]`, path);
    const status = row.status === undefined ? undefined : requireTimelineStatus(row.status, `worklog.timeline[${index}].status`, path);
    return {
      order: requireNonNegativeInteger(row.order, `worklog.timeline[${index}].order`, path),
      title: requireStringMax(row.title, `worklog.timeline[${index}].title`, path, WORKLOG_TIMELINE_TITLE_MAX_LENGTH, false),
      ...(row.description === undefined ? {} : { description: requireStringMax(row.description, `worklog.timeline[${index}].description`, path, WORKLOG_TIMELINE_DESCRIPTION_MAX_LENGTH) }),
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
  return {
    status: requirePrivacyStatus(scan.status, 'privacy_scan.status', path),
    findings: requireArrayMax(scan.findings, 'privacy_scan.findings', path, PRIVACY_FINDINGS_MAX_ITEMS).map((item, index): PrivacyFinding => {
      const finding = requireRecord(item, `privacy_scan.findings[${index}]`, path);
      const resolution = finding.resolution === undefined
        ? undefined
        : requirePrivacyResolution(finding.resolution, `privacy_scan.findings[${index}].resolution`, path);
      return {
        id: requireStringMax(finding.id, `privacy_scan.findings[${index}].id`, path, PRIVACY_FINDING_ID_MAX_LENGTH, false),
        type: requirePrivacyFindingType(finding.type, `privacy_scan.findings[${index}].type`, path),
        severity: requirePrivacySeverity(finding.severity, `privacy_scan.findings[${index}].severity`, path),
        message: requireStringMax(finding.message, `privacy_scan.findings[${index}].message`, path, PRIVACY_FINDING_MESSAGE_MAX_LENGTH, false),
        ...(finding.field === undefined ? {} : { field: requireStringMax(finding.field, `privacy_scan.findings[${index}].field`, path, PRIVACY_FINDING_FIELD_MAX_LENGTH, false) }),
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

  const userNote = optionalStringOrNullMax(worklog.user_note, 'worklog.user_note', path, WORKLOG_USER_NOTE_MAX_LENGTH);
  const model = optionalStringOrNullMax(worklog.model, 'worklog.model', path, WORKLOG_MODEL_MAX_LENGTH);
  const publicPrompt = optionalStringOrNullMax(worklog.public_prompt, 'worklog.public_prompt', path, WORKLOG_PUBLIC_PROMPT_MAX_LENGTH);

  const sessionId = optionalStringOrNullMax(source.session_id, 'source.session_id', path, SOURCE_SESSION_ID_MAX_LENGTH);
  const hostLabel = optionalStringOrNullMax(source.host_label, 'source.host_label', path, SOURCE_HOST_LABEL_MAX_LENGTH);
  const sourceCollectionWindow = validateCollectionWindow(source.collection_window, 'source.collection_window', path);
  const collectionWindowReason = source.collection_window_reason === undefined || source.collection_window_reason === null
    ? source.collection_window_reason
    : requireCollectionWindowReason(source.collection_window_reason, 'source.collection_window_reason', path);
  const collectionFingerprint = optionalStringOrNullMax(source.collection_fingerprint, 'source.collection_fingerprint', path, SOURCE_COLLECTION_FINGERPRINT_MAX_LENGTH);

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
      name: requireStringMax(project.name, 'project.name', path, PROJECT_NAME_MAX_LENGTH, false),
      ...(repositoryUrl === undefined ? {} : { repository_url: repositoryUrl }),
      ...(localPathHash === undefined ? {} : { local_path_hash: localPathHash }),
    },
    worklog: {
      title: requireStringMax(worklog.title, 'worklog.title', path, WORKLOG_TITLE_MAX_LENGTH, false),
      summary: requireStringMax(worklog.summary, 'worklog.summary', path, WORKLOG_SUMMARY_MAX_LENGTH, false),
      ...(userNote === undefined ? {} : { user_note: userNote }),
      agent: requireAgentType(worklog.agent, 'worklog.agent', path),
      ...(model === undefined ? {} : { model }),
      category: requireWorklogCategory(worklog.category, 'worklog.category', path),
      tags: requireStringArrayMax(worklog.tags, 'worklog.tags', path, WORKLOG_TAGS_MAX_ITEMS, WORKLOG_TAG_MAX_LENGTH, false),
      visibility: requirePrivateVisibility(worklog.visibility, 'worklog.visibility', path),
      metrics: validateMetrics(worklog.metrics, path),
      changed_areas: requireStringArrayMax(worklog.changed_areas, 'worklog.changed_areas', path, WORKLOG_CHANGED_AREAS_MAX_ITEMS, WORKLOG_CHANGED_AREA_MAX_LENGTH, false),
      ...(publicPrompt === undefined ? {} : { public_prompt: publicPrompt }),
      outcome: requireStringArrayMax(worklog.outcome, 'worklog.outcome', path, WORKLOG_OUTCOME_MAX_ITEMS),
      timeline: validateTimeline(worklog.timeline, path),
    },
    privacy_scan: validatePrivacyScan(root.privacy_scan, path),
    source: {
      agent: requireAgentType(source.agent, 'source.agent', path),
      ...(sessionId === undefined ? {} : { session_id: sessionId }),
      tool_version: requireStringMax(source.tool_version, 'source.tool_version', path, SOURCE_TOOL_VERSION_MAX_LENGTH),
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
