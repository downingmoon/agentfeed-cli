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
    '- Agent evidence is incomplete; tokens, tool calls, commands, models, and per-agent attribution may be missing.',
    '- Run `agentfeed doctor` to verify Claude/Codex/Cursor/Gemini/Antigravity log detection.',
    '- Retry with `agentfeed collect --explain --session-file <path>` if your agent log is stored outside the default locations.'
  ];
  if (sources.length === 0) {
    lines.push('- Without agent evidence, this draft may be mostly git-diff based instead of full agent-session based.');
    lines.push('- If you used multiple agents, confirm each agent appears under `Sources` or rerun with an explicit `--source`/`--session-file`.');
  } else {
    lines.push('- Low-quality agent evidence can miss token, tool-call, command, or secondary-agent details.');
  }
  return lines;
}

export function formatCollectionWindowLine(window?: CollectionWindow | null, reason?: CollectionWindowReason | null): string | null {
  if (!window?.since && !window?.until) return null;
  const suffix = reason === 'idle_gap' ? ' (auto-sliced after idle gap)' : '';
  return `Collection window: ${window.since ?? 'beginning'} → ${window.until ?? 'now'}${suffix}`;
}
