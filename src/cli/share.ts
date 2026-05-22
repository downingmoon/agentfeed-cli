import type { AgentType, LocalDraft } from '../types.js';
import { flag, option } from './args.js';

export interface ShareOptions {
  dryRun: boolean;
  openReview: boolean;
  json: boolean;
  source?: AgentType;
  sessionFile?: string | null;
  since?: string | null;
  until?: string | null;
}

export function formatMetricsRow(draft: LocalDraft): string {
  const m = draft.worklog.metrics;
  const parts = [`${m.files_changed ?? 0} files`, `+${m.lines_added ?? 0} -${m.lines_removed ?? 0}`];
  if (m.tests_run != null) parts.push(`${m.tests_run} tests`);
  if (m.tool_calls != null) parts.push(`${m.tool_calls} tool calls`);
  if (m.tokens_used != null) parts.push(`${Math.round(m.tokens_used / 1000)}K tokens`);
  return parts.join(' · ');
}

export function formatSharePreview(draft: LocalDraft): string {
  const m = draft.worklog.metrics;
  const model = draft.worklog.model ? ` · ${draft.worklog.model}` : '';
  const changedAreas = draft.worklog.changed_areas.length ? draft.worklog.changed_areas.join(', ') : 'Application code';
  const lines = [
    'Ready to share private review draft',
    '',
    `Project: ${draft.project.name}`,
    `Title: ${draft.worklog.title}`,
    `Summary: ${draft.worklog.summary}`,
    `Agent: ${draft.worklog.agent}${model}`,
    `Metrics: ${formatMetricsRow(draft)}`,
    `Changed areas: ${changedAreas}`,
    `Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`
  ];

  if (m.collection_quality) lines.push(`Collection quality: ${m.collection_quality}`);
  if (m.collection_sources?.length) {
    lines.push('Collection sources:');
    for (const source of m.collection_sources) lines.push(`- ${source.type}: ${source.name} (${source.quality})`);
  }

  lines.push('', 'Upload target: private AgentFeed review draft');
  return lines.join('\n');
}

export function parseShareArgs(args: string[]): ShareOptions {
  const sourceOption = option(args, '--source');
  return {
    dryRun: flag(args, '--dry') || flag(args, '--dry-run'),
    openReview: flag(args, '--open-review'),
    json: flag(args, '--json'),
    source: sourceOption ? sourceOption.replace(/-/g, '_') as AgentType : undefined,
    sessionFile: option(args, '--session-file') ?? null,
    since: option(args, '--since') ?? null,
    until: option(args, '--until') ?? null
  };
}
