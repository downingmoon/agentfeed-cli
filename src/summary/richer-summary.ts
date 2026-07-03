import type { GitMetrics, WorklogMetrics, WorklogTimelineItem } from '../types.js';
import { generateOutcome, generateSummary, generateTimeline, generateTitle } from './rule-based.js';

export interface RicherSummaryInput {
  areas: string[];
  metrics: WorklogMetrics;
  git: GitMetrics;
  tags: string[];
  publicPrompt?: string | null;
}

export interface RicherSummaryFields {
  title: string;
  summary: string;
  changed_areas: string[];
  outcome: string[];
  timeline: WorklogTimelineItem[];
  public_prompt: string | null;
  tags: string[];
}

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

function fileMetricSentence(input: RicherSummaryInput): string | null {
  if (!positive(input.metrics.files_changed) && input.metrics.files_changed !== 0) return null;
  const files = input.metrics.files_changed ?? 0;
  if (input.metrics.lines_added == null && input.metrics.lines_removed == null) {
    return `It changed ${files} files; aggregate line totals were not available from the collected evidence.`;
  }
  const additions = input.metrics.lines_added ?? 0;
  const deletions = input.metrics.lines_removed ?? 0;
  return `It changed ${files} files with ${additions} additions and ${deletions} deletions captured as aggregate metrics.`;
}

function testMetricSentence(metrics: WorklogMetrics): string | null {
  if (!positive(metrics.tests_run)) return null;
  const testsRun = metrics.tests_run ?? 0;
  const testsPassed = metrics.tests_passed ?? 0;
  const commandText = positive(metrics.commands_run) ? ` from ${metrics.commands_run} local commands` : '';
  if (testsRun === testsPassed) return `Verification evidence includes ${testsPassed} passing tests${commandText}.`;
  return `Verification evidence includes ${testsPassed} passing tests out of ${testsRun}${commandText}.`;
}

function richerSummary(input: RicherSummaryInput, areas: string[]): string {
  const sentences = [
    `This work focused on ${areaText(areas)}.`,
    fileMetricSentence(input),
    testMetricSentence(input.metrics),
    'The upload-ready draft keeps raw transcripts, diffs, and source text local; only public-safe labels, metrics, outcomes, and timeline entries are prepared for review.',
  ].filter((sentence): sentence is string => typeof sentence === 'string' && sentence.length > 0);
  return sentences.join(' ').slice(0, 2000);
}

function richerTitle(areas: string[], metrics: WorklogMetrics): string {
  const prefix = positive(metrics.tests_passed) ? 'Verified' : 'Summarized';
  return `${prefix} ${areaText(areas)} changes`.slice(0, 120);
}

function richerOutcome(input: RicherSummaryInput, areas: string[]): string[] {
  const outcome = [`Updated ${areaText(areas)}`];
  if (positive(input.metrics.files_changed)) outcome.push(`Captured ${input.metrics.files_changed} changed files as aggregate metrics`);
  if (positive(input.metrics.lines_added) || positive(input.metrics.lines_removed)) outcome.push(`Recorded ${input.metrics.lines_added ?? 0} additions and ${input.metrics.lines_removed ?? 0} deletions without file paths`);
  if (positive(input.metrics.tests_run)) outcome.push(`Captured ${input.metrics.tests_passed ?? 0} passing tests as verification evidence`);
  outcome.push('Prepared a public-safe review draft without raw transcript or diff upload');
  return outcome.slice(0, 10);
}

function richerTimeline(): WorklogTimelineItem[] {
  return [
    { order: 1, title: 'Collected local evidence', description: 'Summarized local agent and git metrics without uploading raw transcript or diff content.', status: 'info' },
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
    title: richerTitle(areas, input.metrics),
    summary: richerSummary(input, areas),
    changed_areas: areas,
    outcome: richerOutcome(input, areas),
    timeline: richerTimeline(),
    public_prompt: boundedPublicPrompt(input.publicPrompt),
    tags: publicTags(input.tags),
  };
}
