import type { GitMetrics, WorklogMetrics, WorklogTimelineItem } from '../types.js';

function positive(value?: number | null): boolean {
  return typeof value === 'number' && value > 0;
}

function areaText(areas: readonly string[]): string {
  const normalized = areas.map((area) => area.trim()).filter(Boolean);
  if (normalized.length === 0) return 'the project';
  if (normalized.length === 1) return normalized[0] ?? 'the project';
  if (normalized.length === 2) return `${normalized[0]} and ${normalized[1]}`;
  const head = normalized.slice(0, -1).join(', ');
  const tail = normalized.at(-1) ?? 'the project';
  return `${head}, and ${tail}`;
}

function changedFilesEvidence(metrics: WorklogMetrics): string | null {
  if (!positive(metrics.files_changed) && !positive(metrics.lines_added) && !positive(metrics.lines_removed)) return null;
  const parts: string[] = [];
  if (positive(metrics.files_changed)) parts.push(`${metrics.files_changed} files touched`);
  if (positive(metrics.lines_added) || positive(metrics.lines_removed)) {
    parts.push(`+${metrics.lines_added ?? 0}/-${metrics.lines_removed ?? 0} lines`);
  }
  return parts.join(', ');
}

function testEvidence(metrics: WorklogMetrics): string | null {
  if (!positive(metrics.tests_run)) return null;
  const testsRun = metrics.tests_run ?? 0;
  const testsPassed = metrics.tests_passed ?? 0;
  if (testsRun === testsPassed) return `${testsPassed} tests passing`;
  return `${testsPassed}/${testsRun} tests passing`;
}

function evidenceSentence(metrics: WorklogMetrics): string | null {
  const evidence = [changedFilesEvidence(metrics), testEvidence(metrics)].filter((item): item is string => Boolean(item));
  return evidence.length > 0 ? `Supporting evidence: ${evidence.join(', ')}.` : null;
}

export function generateTitle(areas: string[], metrics: GitMetrics): string {
  if (metrics.files_changed === 0 || areas.length === 0) return 'Explored project with AI agent';
  if (areas.length > 1) return `Updated ${areas[0]} and ${areas[1]}`.slice(0, 120);
  return `Updated ${areas[0]}`.slice(0, 120);
}

export function generateSummary(areas: string[], metrics: WorklogMetrics): string {
  const sentences = [
    `Prepared a public-safe reviewable build story for ${areaText(areas)}.`,
    evidenceSentence(metrics),
    'Raw transcripts, diffs, and source text stay local; AgentFeed shares only safe labels and aggregate evidence.',
  ].filter((sentence): sentence is string => typeof sentence === 'string' && sentence.length > 0);
  return sentences.join(' ').slice(0, 2000);
}

export function generateOutcome(areas: string[]): string[] {
  const outcome = areas.length ? areas.map((area) => area === 'Test coverage' ? 'Added or modified test coverage' : `Updated ${area}`) : ['Generated a reviewable AI worklog draft'];
  if (!outcome.includes('Generated a reviewable AI worklog draft')) outcome.push('Generated a reviewable AI worklog draft');
  return outcome.slice(0, 10);
}

export function generateTimeline(): WorklogTimelineItem[] {
  return [
    { order: 1, title: 'Collected AI agent session metadata', status: 'info' },
    { order: 2, title: 'Collected Git change metrics', status: 'success' },
    { order: 3, title: 'Generated public-safe worklog summary', status: 'success' },
    { order: 4, title: 'Ran privacy scan', status: 'success' }
  ];
}
