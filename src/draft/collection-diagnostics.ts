import type { CollectionQuality, CollectionWindow, CollectionWindowReason, WorklogMetrics } from '../types.js';

export type CollectionQualityLabel = CollectionQuality | 'unknown';

export function collectionQualityLabel(metrics: WorklogMetrics): CollectionQualityLabel {
  return metrics.collection_quality ?? 'unknown';
}

export function formatCollectionGuidanceLines(metrics: WorklogMetrics): string[] {
  const quality = collectionQualityLabel(metrics);
  const sources = metrics.collection_sources ?? [];
  if (quality !== 'low' && quality !== 'unknown' && sources.length > 0) return [];

  const lines = [
    'Collection guidance:',
    '- Run `agentfeed doctor` to verify Claude/Codex/Gemini session and plugin detection.',
    '- Retry with `agentfeed collect --explain --session-file <path>` if your agent log is stored outside the default locations.'
  ];
  if (sources.length === 0) {
    lines.push('- Without agent evidence, this draft may be mostly git-diff based.');
  } else {
    lines.push('- Low-quality agent evidence can miss token, tool-call, or command details.');
  }
  return lines;
}

export function formatCollectionWindowLine(window?: CollectionWindow | null, reason?: CollectionWindowReason | null): string | null {
  if (!window?.since && !window?.until) return null;
  const suffix = reason === 'idle_gap' ? ' (auto-sliced after idle gap)' : '';
  return `Collection window: ${window.since ?? 'beginning'} → ${window.until ?? 'now'}${suffix}`;
}
