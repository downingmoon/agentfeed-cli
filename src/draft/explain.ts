import type { LocalDraft } from '../types.js';
import { collectionQualityLabel, formatCollectionGuidanceLines } from './collection-diagnostics.js';

export function formatCollectionExplain(draft: LocalDraft): string {
  const metrics = draft.worklog.metrics;
  const lines = [`Collection quality: ${collectionQualityLabel(metrics)}`];
  const window = draft.source.collection_window;
  if (window?.since || window?.until) lines.push(`Collection window: ${window.since ?? 'beginning'} → ${window.until ?? 'now'}`);
  lines.push('Sources:');
  for (const source of metrics.collection_sources ?? []) {
    lines.push(`- ${source.type}: ${source.name} (${source.quality})`);
  }
  if (!metrics.collection_sources?.length) lines.push('- none');
  lines.push(...formatCollectionGuidanceLines(metrics));
  return lines.join('\n');
}
