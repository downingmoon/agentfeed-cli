import type { LocalDraft } from '../types.js';
import { collectionQualityLabel, formatCollectionGuidanceLines, formatCollectionWindowLine } from './collection-diagnostics.js';

export function formatCollectionExplain(draft: LocalDraft): string {
  const metrics = draft.worklog.metrics;
  const lines = [`Collection quality: ${collectionQualityLabel(metrics)}`];
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
