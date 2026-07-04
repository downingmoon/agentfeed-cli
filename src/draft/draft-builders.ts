import { hostname } from 'node:os';
import type { AgentFeedProjectConfig, AgentType, CollectionWindow, CollectionWindowReason, GitMetrics, LocalDraft, WorklogMetrics } from '../types.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { generateOutcome, generateSummary, generateTimeline } from '../summary/rule-based.js';
import { generateRicherSummaryFields } from '../summary/richer-summary.js';
import { randomSuffix, shortHash } from '../utils/hash.js';
import { AGENTFEED_TOOL_VERSION } from '../version.js';
import { parseRequiredRedactedDraftFields } from './redacted-draft-fields.js';

function draftId(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `draft_${stamp}_${randomSuffix(4)}`;
}

export function buildEmptyDraft(input: { readonly projectName: string; readonly projectRoot: string; readonly source: AgentType }): LocalDraft {
  const areas = ['Application code'];
  const metrics: WorklogMetrics = { files_changed: 0, lines_added: 0, lines_removed: 0, tokens_used: null, estimated_cost_usd: null, tests_run: null, tests_passed: null, failed_commands: null };
  const title = 'Explored project with AI agent';
  const summary = generateSummary(areas, metrics);
  const publicFields = { title, summary, user_note: null, outcome: generateOutcome(areas), timeline: generateTimeline(), changed_areas: areas, tags: [], project: { name: input.projectName, repository_url: null } };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  const fields = parseRequiredRedactedDraftFields(redacted);
  return {
    schema_version: '0.2',
    id: draftId(),
    project: { name: fields.project.name, repository_url: null, local_path_hash: shortHash(input.projectRoot, 16) },
    worklog: { title: fields.title, summary: fields.summary, user_note: fields.user_note, agent: input.source, model: null, category: 'ai_tool', tags: fields.tags, visibility: 'private', metrics, changed_areas: fields.changed_areas, public_prompt: null, outcome: fields.outcome, timeline: fields.timeline },
    privacy_scan: scan,
    source: { agent: input.source, tool_version: AGENTFEED_TOOL_VERSION, host_label: hostname(), created_at: new Date().toISOString() },
    upload: { uploaded: false }
  };
}

export function buildCollectedDraft(input: {
  readonly root: string;
  readonly config: AgentFeedProjectConfig;
  readonly git: GitMetrics;
  readonly source: AgentType;
  readonly sessionId: string | null;
  readonly sessionModel: string | null;
  readonly metrics: WorklogMetrics;
  readonly safeAreas: readonly string[];
  readonly normalizedNote: string | null;
  readonly actualWindow: CollectionWindow | null;
  readonly actualWindowReason: CollectionWindowReason | null;
  readonly fingerprint: string | null;
}): LocalDraft {
  const generatedPublicFields = generateRicherSummaryFields({
    areas: [...input.safeAreas],
    metrics: input.metrics,
    git: input.git,
    tags: input.config.project.tags,
    publicPrompt: null,
  });
  const publicFields = {
    ...generatedPublicFields,
    user_note: input.normalizedNote,
    project: { name: input.config.project.name, repository_url: input.git.repository_url ?? input.config.project.repository_url ?? null }
  };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  const fields = parseRequiredRedactedDraftFields(redacted);
  return {
    schema_version: '0.2',
    id: draftId(),
    project: { name: fields.project.name, repository_url: fields.project.repository_url ?? null, local_path_hash: shortHash(input.root, 16) },
    worklog: {
      title: fields.title.slice(0, 120) || 'Explored project with AI agent',
      summary: fields.summary.slice(0, 2000) || 'The AI agent worked on the project.',
      user_note: fields.user_note?.slice(0, 500) ?? null,
      agent: input.source,
      model: input.sessionModel,
      category: 'ai_tool',
      tags: fields.tags.slice(0, 10),
      visibility: 'private',
      metrics: input.metrics,
      changed_areas: fields.changed_areas.slice(0, 8),
      public_prompt: input.config.collection.include_public_prompt ? fields.public_prompt : null,
      outcome: fields.outcome.slice(0, 10),
      timeline: fields.timeline.slice(0, 8)
    },
    privacy_scan: scan,
    source: { agent: input.source, tool_version: AGENTFEED_TOOL_VERSION, host_label: hostname(), session_id: input.sessionId, created_at: new Date().toISOString(), collection_window: input.actualWindow, collection_window_reason: input.actualWindowReason, collection_fingerprint: input.fingerprint },
    upload: { uploaded: false }
  };
}
