import type { GitMetrics, WorklogMetrics, WorklogTimelineItem } from '../types.js';

export function generateTitle(areas: string[], metrics: GitMetrics): string {
  if (metrics.files_changed === 0 || areas.length === 0) return 'Explored project with AI agent';
  if (areas.length > 1) return `Updated ${areas[0]} and ${areas[1]}`.slice(0, 120);
  return `Updated ${areas[0]}`.slice(0, 120);
}

export function generateSummary(areas: string[], metrics: WorklogMetrics): string {
  const areaText = areas.length ? areas.map((a) => a.toLowerCase()).join(', ') : 'the project';
  const includeFileStats = metrics.files_changed != null || metrics.lines_added != null || metrics.lines_removed != null;
  let summary = `The AI agent worked on ${areaText}.`;
  if (includeFileStats) summary += ` The session changed ${metrics.files_changed ?? 0} files with ${metrics.lines_added ?? 0} additions and ${metrics.lines_removed ?? 0} deletions.`;
  if (metrics.tests_run != null) summary += ` It also ran ${metrics.tests_run} tests, with ${metrics.tests_passed ?? 0} passing.`;
  return summary.slice(0, 2000);
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
