import type { AgentType, GitMetrics, WorklogMetrics, WorklogTimelineItem } from '../types.js';
import { generateOutcome, generateSummary, generateTimeline, generateTitle } from './rule-based.js';

export interface RicherSummaryInput {
  readonly areas: string[];
  readonly metrics: WorklogMetrics;
  readonly git: GitMetrics;
  readonly tags: string[];
  readonly agent?: AgentType | null;
  readonly model?: string | null;
  readonly publicPrompt?: string | null;
}

export interface RicherSummaryFields {
  readonly title: string;
  readonly summary: string;
  readonly changed_areas: string[];
  readonly outcome: string[];
  readonly timeline: WorklogTimelineItem[];
  readonly public_prompt: string | null;
  readonly tags: string[];
}

const AGENT_LABELS: Readonly<Record<AgentType, string>> = {
  claude_code: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  gemini_cli: 'Antigravity',
  other: 'AI agent',
} as const;

function positive(value?: number | null): boolean {
  return typeof value === 'number' && value > 0;
}

function meaningfulAreas(areas: string[]): string[] {
  const normalized = areas.map((area) => area.trim()).filter(Boolean);
  return normalized.length ? normalized.slice(0, 8) : ['Application code'];
}

function areaText(areas: string[]): string {
  if (areas.length <= 1) return areas[0] ?? 'Application code';
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;
  const head = areas.slice(0, -1).join(', ');
  const tail = areas.at(-1) ?? 'Application code';
  return `${head}, and ${tail}`;
}

function hasRicherEvidence(input: RicherSummaryInput, areas: string[]): boolean {
  return positive(input.metrics.tests_run)
    || positive(input.metrics.commands_run)
    || positive(input.metrics.tool_calls)
    || input.metrics.collection_quality != null
    || (input.git.files_changed > 0 && (input.git.lines_added > 0 || input.git.lines_removed > 0))
    || areas.length > 1;
}

function publicTag(tag: string): string | null {
  const trimmed = tag.trim();
  if (!trimmed || trimmed.length > 50) return null;
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('@') || trimmed.includes('://')) return null;
  if (/(api[_-]?key|credential|password|secret|sk_live|token)/i.test(trimmed)) return null;
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(trimmed)) return null;
  return trimmed;
}

function publicTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const safe: string[] = [];
  for (const tag of tags) {
    const normalized = publicTag(tag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    safe.push(normalized);
  }
  return safe.slice(0, 10);
}

function boundedPublicPrompt(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 12000) : null;
}

function publicAgentLabel(agent?: AgentType | null): string {
  return agent ? AGENT_LABELS[agent] : AGENT_LABELS.other;
}

function publicModelLabel(model?: string | null): string | null {
  const trimmed = model?.replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('@') || trimmed.includes('://')) return null;
  if (/(api[_-]?key|credential|password|secret|sk_live|token)/i.test(trimmed)) return null;
  return trimmed;
}

function fileMetricEvidence(input: RicherSummaryInput): string | null {
  if (!positive(input.metrics.files_changed) && input.metrics.files_changed !== 0) return null;
  const files = input.metrics.files_changed ?? 0;
  if (input.metrics.lines_added == null && input.metrics.lines_removed == null) {
    return `${files} files touched; aggregate line totals unavailable`;
  }
  const additions = input.metrics.lines_added ?? 0;
  const deletions = input.metrics.lines_removed ?? 0;
  return `${files} files touched, +${additions}/-${deletions} lines`;
}

function testMetricEvidence(metrics: WorklogMetrics): string | null {
  if (!positive(metrics.tests_run)) return null;
  const testsRun = metrics.tests_run ?? 0;
  const testsPassed = metrics.tests_passed ?? 0;
  if (testsRun === testsPassed) return `${testsPassed} tests passing`;
  return `${testsPassed}/${testsRun} tests passing`;
}

function workflowEvidence(input: RicherSummaryInput): string | null {
  const model = publicModelLabel(input.model);
  const evidence = [
    model ? `model ${model}` : null,
    input.metrics.collection_quality ? `${input.metrics.collection_quality}-quality local collection` : null,
    positive(input.metrics.commands_run) ? `${input.metrics.commands_run} local commands` : null,
    positive(input.metrics.tool_calls) ? `${input.metrics.tool_calls} agent tool calls` : null,
  ].filter((item): item is string => Boolean(item));
  return evidence.length > 0 ? evidence.join(', ') : null;
}

function supportingEvidenceSentence(input: RicherSummaryInput): string | null {
  const evidence = [fileMetricEvidence(input), testMetricEvidence(input.metrics), workflowEvidence(input)].filter((item): item is string => Boolean(item));
  return evidence.length > 0 ? `Supporting evidence: ${evidence.join('; ')}.` : null;
}

function richerSummary(input: RicherSummaryInput, areas: string[]): string {
  const agentLabel = publicAgentLabel(input.agent);
  const sentences = [
    `${agentLabel} prepared a review-ready ${areaText(areas)} update that explains the change before readers inspect the metrics.`,
    supportingEvidenceSentence(input),
    'AgentFeed converts local evidence into public-safe labels, metrics, outcomes, and timeline entries for review; raw transcripts, diffs, source text, and file paths stay local.',
  ].filter((sentence): sentence is string => typeof sentence === 'string' && sentence.length > 0);
  return sentences.join(' ').slice(0, 2000);
}

function richerTitle(input: RicherSummaryInput, areas: string[]): string {
  const prefix = positive(input.metrics.tests_passed) ? 'Verified' : 'Summarized';
  return `${prefix} ${areaText(areas)} with ${publicAgentLabel(input.agent)}`.slice(0, 120);
}

function richerOutcome(input: RicherSummaryInput, areas: string[]): string[] {
  const outcome = [`Updated ${areaText(areas)}`];
  if (positive(input.metrics.files_changed)) outcome.push(`Captured ${input.metrics.files_changed} changed files as aggregate metrics`);
  if (positive(input.metrics.lines_added) || positive(input.metrics.lines_removed)) outcome.push(`Recorded ${input.metrics.lines_added ?? 0} additions and ${input.metrics.lines_removed ?? 0} deletions without file paths`);
  if (positive(input.metrics.tests_run)) outcome.push(`Captured ${input.metrics.tests_passed ?? 0} passing tests as verification evidence`);
  if (positive(input.metrics.tool_calls)) outcome.push(`Captured ${input.metrics.tool_calls} agent tool calls as local workflow evidence`);
  outcome.push('Prepared a public-safe review draft without raw transcript or diff upload');
  return outcome.slice(0, 10);
}

function richerTimeline(input: RicherSummaryInput): WorklogTimelineItem[] {
  const agentLabel = publicAgentLabel(input.agent);
  return [
    { order: 1, title: `Collected ${agentLabel} evidence`, description: 'Summarized local agent and git metrics without uploading raw transcript or diff content.', status: 'info' },
    { order: 2, title: 'Classified public-safe changed areas', description: 'Converted file-level evidence into product-level area labels.', status: 'success' },
    { order: 3, title: 'Generated richer public summary', description: 'Prepared bounded title, summary, outcome, tags, and timeline fields for user review.', status: 'success' },
    { order: 4, title: 'Ran privacy scan before upload', description: 'Scanned uploadable public fields before constructing the ingest payload.', status: 'success' },
  ];
}

export function generateRicherSummaryFields(input: RicherSummaryInput): RicherSummaryFields {
  const areas = meaningfulAreas(input.areas);
  if (!hasRicherEvidence(input, areas)) {
    return {
      title: generateTitle(areas, input.git),
      summary: generateSummary(areas, input.metrics),
      changed_areas: areas,
      outcome: generateOutcome(areas),
      timeline: generateTimeline(),
      public_prompt: boundedPublicPrompt(input.publicPrompt),
      tags: publicTags(input.tags),
    };
  }
  return {
    title: richerTitle(input, areas),
    summary: richerSummary(input, areas),
    changed_areas: areas,
    outcome: richerOutcome(input, areas),
    timeline: richerTimeline(input),
    public_prompt: boundedPublicPrompt(input.publicPrompt),
    tags: publicTags(input.tags),
  };
}
