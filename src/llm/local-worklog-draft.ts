import type { LocalDraft, WorklogTimelineItem } from '../types.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { parseRequiredRedactedDraftFields } from '../draft/redacted-draft-fields.js';

export type AiWorklogPatch = {
  readonly title?: string;
  readonly summary?: string;
  readonly changed_areas?: readonly string[];
  readonly outcome?: readonly string[];
  readonly timeline?: readonly WorklogTimelineItem[];
  readonly tags?: readonly string[];
  readonly public_prompt?: string | null;
};

const VALID_TIMELINE_STATUSES = ['success', 'warning', 'failed', 'info'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalStringArray(value: unknown, limit: number): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
  return values.length ? values : undefined;
}

function timelineStatus(value: unknown): WorklogTimelineItem['status'] | undefined {
  if (typeof value !== 'string') return undefined;
  for (const status of VALID_TIMELINE_STATUSES) {
    if (value === status) return status;
  }
  return undefined;
}

function optionalTimeline(value: unknown): readonly WorklogTimelineItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: WorklogTimelineItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const title = optionalString(item.title);
    if (!title) continue;
    const orderValue = typeof item.order === 'number' && Number.isInteger(item.order) && item.order >= 0 ? item.order : rows.length + 1;
    const description = optionalString(item.description);
    const status = timelineStatus(item.status);
    rows.push({
      order: orderValue,
      title,
      ...(description ? { description } : {}),
      ...(status ? { status } : {})
    });
  }
  return rows.length ? rows.slice(0, 8) : undefined;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Local AI worklog response did not contain a JSON object.');
  return text.slice(start, end + 1);
}

export function parseAiWorklogPatch(text: string): AiWorklogPatch {
  const parsed: unknown = JSON.parse(extractJsonObject(text));
  if (!isRecord(parsed)) throw new Error('Local AI worklog response JSON must be an object.');
  const publicPrompt = parsed.public_prompt === null ? null : optionalString(parsed.public_prompt);
  return {
    title: optionalString(parsed.title),
    summary: optionalString(parsed.summary),
    changed_areas: optionalStringArray(parsed.changed_areas, 8),
    outcome: optionalStringArray(parsed.outcome, 10),
    timeline: optionalTimeline(parsed.timeline),
    tags: optionalStringArray(parsed.tags, 10),
    ...(publicPrompt !== undefined ? { public_prompt: publicPrompt } : {})
  };
}

export function buildAiWorklogPrompt(draft: LocalDraft): string {
  return [
    'You are writing a public-safe AgentFeed worklog from already-collected metadata.',
    'Do not invent secrets, URLs, local paths, private customer names, or code content.',
    'Do not modify files or run commands. Output JSON only, no markdown fences.',
    'Return keys: title, summary, changed_areas, outcome, timeline, tags, public_prompt.',
    'Constraints: title <= 120 chars; summary <= 2000 chars; arrays concise; timeline items use {"order", "title", "description", "status"}.',
    '',
    JSON.stringify({
      project: draft.project,
      worklog: {
        title: draft.worklog.title,
        summary: draft.worklog.summary,
        user_note: draft.worklog.user_note ?? null,
        agent: draft.worklog.agent,
        model: draft.worklog.model ?? null,
        metrics: draft.worklog.metrics,
        changed_areas: draft.worklog.changed_areas,
        outcome: draft.worklog.outcome,
        timeline: draft.worklog.timeline,
        tags: draft.worklog.tags,
        public_prompt: draft.worklog.public_prompt ?? null
      },
      privacy_scan: draft.privacy_scan,
      source: draft.source
    }, null, 2)
  ].join('\n');
}

export function applyAiWorklogPatch(draft: LocalDraft, patch: AiWorklogPatch): LocalDraft {
  const publicFields = {
    title: patch.title ?? draft.worklog.title,
    summary: patch.summary ?? draft.worklog.summary,
    user_note: draft.worklog.user_note ?? null,
    public_prompt: patch.public_prompt ?? draft.worklog.public_prompt ?? null,
    outcome: patch.outcome ? [...patch.outcome] : draft.worklog.outcome,
    timeline: patch.timeline ? [...patch.timeline] : draft.worklog.timeline,
    changed_areas: patch.changed_areas ? [...patch.changed_areas] : draft.worklog.changed_areas,
    tags: patch.tags ? [...patch.tags] : draft.worklog.tags,
    project: draft.project
  };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  const fields = parseRequiredRedactedDraftFields(redacted);
  return {
    ...draft,
    project: { ...draft.project, name: fields.project.name, repository_url: fields.project.repository_url ?? null },
    worklog: {
      ...draft.worklog,
      title: fields.title.slice(0, 120) || draft.worklog.title,
      summary: fields.summary.slice(0, 2000) || draft.worklog.summary,
      user_note: fields.user_note?.slice(0, 500) ?? null,
      tags: fields.tags.slice(0, 10),
      changed_areas: fields.changed_areas.slice(0, 8),
      public_prompt: fields.public_prompt,
      outcome: fields.outcome.slice(0, 10),
      timeline: fields.timeline.slice(0, 8)
    },
    privacy_scan: scan
  };
}
