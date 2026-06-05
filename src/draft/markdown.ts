import type { LocalDraft } from '../types.js';

function metricValue(value?: number | null): string {
  return value == null ? 'Unknown' : `${value}`;
}

function lineMetrics(added?: number | null, removed?: number | null): string {
  if (added == null && removed == null) return 'Unknown';
  return `+${added ?? 0} -${removed ?? 0}`;
}

function modelsLabel(draft: LocalDraft): string {
  const models = draft.worklog.metrics.models_used?.length
    ? draft.worklog.metrics.models_used
    : draft.worklog.model ? [draft.worklog.model] : [];
  return models.length ? models.join(', ') : 'Unknown';
}

function agentMetricsMarkdown(draft: LocalDraft): string {
  const rows = draft.worklog.metrics.agent_metrics;
  if (!rows?.length) return '';
  return `\n\n## Agent Breakdown\n\n${rows.map((row) => [
    `- ${row.agent}`,
    row.model ? `model ${row.model}` : null,
    row.tokens_used != null ? `${row.tokens_used} tokens` : null,
    row.files_changed != null ? `${row.files_changed} files` : null,
    row.lines_added != null || row.lines_removed != null ? lineMetrics(row.lines_added, row.lines_removed) : null,
    row.tool_calls != null ? `${row.tool_calls} tool calls` : null,
    row.commands_run != null ? `${row.commands_run} commands` : null
  ].filter(Boolean).join(' · ')).join('\n')}`;
}

export function draftMarkdown(draft: LocalDraft): string {
  const metrics = draft.worklog.metrics;
  const note = draft.worklog.user_note ? `\n\n## Note\n\n${draft.worklog.user_note}` : '';
  return `# ${draft.worklog.title}\n\n${draft.worklog.summary}${note}\n\n## Metrics\n\n- Agent: ${draft.worklog.agent}\n- Models: ${modelsLabel(draft)}\n- Tokens: ${metricValue(metrics.tokens_used)}\n- Files changed: ${metricValue(metrics.files_changed)}\n- Lines: ${lineMetrics(metrics.lines_added, metrics.lines_removed)}\n- Tests: ${metricValue(metrics.tests_run)}${agentMetricsMarkdown(draft)}\n\n## Changed Areas\n\n${draft.worklog.changed_areas.map((a) => `- ${a}`).join('\n') || '- Application code'}\n\n## Outcome\n\n${draft.worklog.outcome.map((o) => `- ${o}`).join('\n')}\n\n## Privacy\n\nStatus: ${draft.privacy_scan.status}\n`;
}
