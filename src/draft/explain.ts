import type { LocalDraft } from '../types.js';

export function formatCollectionExplain(draft: LocalDraft): string {
  const metrics = draft.worklog.metrics;
  const lines = [`Collection quality: ${metrics.collection_quality ?? 'unknown'}`];
  lines.push('Sources:');
  for (const source of metrics.collection_sources ?? []) {
    lines.push(`- ${source.type}: ${source.name} (${source.quality})`);
  }
  if (!metrics.collection_sources?.length) lines.push('- none');
  return lines.join('\n');
}
