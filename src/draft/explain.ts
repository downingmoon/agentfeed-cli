import type { LocalDraft } from '../types.js';
import { collectionQualityLabel, formatCollectionGuidanceLines, formatCollectionWindowLine } from './collection-diagnostics.js';

export function formatCollectionExplain(draft: LocalDraft): string {
  const metrics = draft.worklog.metrics;
  const lines = [`Collection quality: ${collectionQualityLabel(metrics)}`];
  const models = metrics.models_used?.length ? metrics.models_used : draft.worklog.model ? [draft.worklog.model] : [];
  if (models.length) lines.push(`Models: ${models.join(', ')}`);
  if (metrics.agent_metrics?.length) {
    lines.push('Per-agent metrics:');
    for (const metric of metrics.agent_metrics) {
      const parts = [
        metric.model ?? null,
        metric.tokens_used != null ? `${metric.tokens_used} tokens` : null,
        metric.files_changed != null ? `${metric.files_changed} files` : null,
        metric.lines_added != null || metric.lines_removed != null ? `+${metric.lines_added ?? 0} -${metric.lines_removed ?? 0}` : null,
        metric.tool_calls != null ? `${metric.tool_calls} tool calls` : null,
        metric.commands_run != null ? `${metric.commands_run} commands` : null
      ].filter((part): part is string => Boolean(part));
      lines.push(`- ${metric.agent}: ${parts.length ? parts.join(' · ') : 'no metrics'}`);
    }
  }
  const windowLine = formatCollectionWindowLine(draft.source.collection_window, draft.source.collection_window_reason);
  if (windowLine) lines.push(windowLine);
  lines.push('Sources:');
  for (const source of metrics.collection_sources ?? []) {
    lines.push(`- ${source.type}: ${source.name} (${source.quality})`);
  }
  if (!metrics.collection_sources?.length) lines.push('- none');
  lines.push(...formatCollectionGuidanceLines(metrics));
  return lines.join('\n');
}
