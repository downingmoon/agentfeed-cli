import type { LocalDraft } from '../types.js';

function metricValue(value?: number | null): string {
  return value == null ? 'Unknown' : `${value}`;
}

function lineMetrics(added?: number | null, removed?: number | null): string {
  if (added == null && removed == null) return 'Unknown';
  return `+${added ?? 0} -${removed ?? 0}`;
}

export function draftMarkdown(draft: LocalDraft): string {
  const metrics = draft.worklog.metrics;
  return `# ${draft.worklog.title}\n\n${draft.worklog.summary}\n\n## Metrics\n\n- Agent: ${draft.worklog.agent}\n- Tokens: ${metricValue(metrics.tokens_used)}\n- Files changed: ${metricValue(metrics.files_changed)}\n- Lines: ${lineMetrics(metrics.lines_added, metrics.lines_removed)}\n- Tests: ${metricValue(metrics.tests_run)}\n\n## Changed Areas\n\n${draft.worklog.changed_areas.map((a) => `- ${a}`).join('\n') || '- Application code'}\n\n## Outcome\n\n${draft.worklog.outcome.map((o) => `- ${o}`).join('\n')}\n\n## Privacy\n\nStatus: ${draft.privacy_scan.status}\n`;
}
