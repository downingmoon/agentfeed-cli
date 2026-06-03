import type { AgentType, LocalDraft } from '../types.js';
import { collectionQualityLabel, formatCollectionGuidanceLines, formatCollectionWindowLine } from '../draft/collection-diagnostics.js';
import { flag, option } from './args.js';
import { parseAgentSource } from './source.js';

export interface ShareOptions {
  dryRun: boolean;
  openReview: boolean;
  noOpenReview: boolean;
  json: boolean;
  source?: AgentType;
  sessionFile?: string | null;
  since?: string | null;
  until?: string | null;
  note?: string | null;
  noClipboard: boolean;
  runConfiguredCommands: boolean;
  yes: boolean;
}

export function formatMetricsRow(draft: LocalDraft): string {
  const m = draft.worklog.metrics;
  const parts: string[] = [];
  if (m.files_changed != null || m.lines_added != null || m.lines_removed != null) {
    if (m.files_changed != null) parts.push(`${m.files_changed} files`);
    if (m.lines_added != null || m.lines_removed != null) parts.push(`+${m.lines_added ?? 0} -${m.lines_removed ?? 0}`);
  }
  if (m.tests_run != null) parts.push(`${m.tests_run} tests`);
  if (m.tool_calls != null) parts.push(`${m.tool_calls} tool calls`);
  if (m.tokens_used != null) parts.push(`${Math.round(m.tokens_used / 1000)}K tokens`);
  return parts.length ? parts.join(' · ') : 'no metrics';
}

export function privacyPublicPublishBlocked(draft: LocalDraft): boolean {
  return draft.privacy_scan.status === 'danger'
    || draft.privacy_scan.findings.some((finding) => finding.severity === 'high' && !finding.resolved);
}

export interface PrivacyPolicySummary {
  private_review_upload: 'allowed';
  public_publish_blocked: boolean;
  review_required: boolean;
}

export function privacyPolicySummary(draft: LocalDraft): PrivacyPolicySummary {
  const publicPublishBlocked = privacyPublicPublishBlocked(draft);
  return {
    private_review_upload: 'allowed',
    public_publish_blocked: publicPublishBlocked,
    review_required: publicPublishBlocked || draft.privacy_scan.status !== 'safe'
  };
}

export function formatPrivacyPolicyLines(draft: LocalDraft): string[] {
  const policy = privacyPolicySummary(draft);
  if (!policy.review_required) return [];

  const lines = ['Privacy review: required before public publishing.'];
  if (policy.public_publish_blocked) {
    lines.push('Public/unlisted publishing is blocked in AgentFeed until high-severity findings are resolved.');
  }
  lines.push('Private review upload is allowed so you can resolve findings in the web review.');
  return lines;
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
    ...(draft.worklog.user_note ? [`Note: ${draft.worklog.user_note}`] : []),
    `Agent: ${draft.worklog.agent}${model}`,
    `Metrics: ${formatMetricsRow(draft)}`,
    `Changed areas: ${changedAreas}`,
    `Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`
  ];
  lines.push(...formatPrivacyPolicyLines(draft));

  lines.push(`Collection quality: ${collectionQualityLabel(m)}`);
  const windowLine = formatCollectionWindowLine(draft.source.collection_window, draft.source.collection_window_reason);
  if (windowLine) lines.push(windowLine);
  if (m.collection_sources?.length) {
    lines.push('Collection sources:');
    for (const source of m.collection_sources) lines.push(`- ${source.type}: ${source.name} (${source.quality})`);
  } else {
    lines.push('Collection sources: none');
  }
  lines.push(...formatCollectionGuidanceLines(m));

  lines.push('', 'Upload target: private AgentFeed review draft');
  return lines.join('\n');
}

export function parseShareArgs(args: string[]): ShareOptions {
  return {
    dryRun: flag(args, '--dry') || flag(args, '--dry-run'),
    openReview: flag(args, '--open-review'),
    noOpenReview: flag(args, '--no-open-review'),
    json: flag(args, '--json'),
    source: parseAgentSource(option(args, '--source')),
    sessionFile: option(args, '--session-file') ?? null,
    since: option(args, '--since') ?? null,
    until: option(args, '--until') ?? null,
    note: option(args, '--note') ?? null,
    noClipboard: flag(args, '--no-clipboard') || flag(args, '--no-clip'),
    runConfiguredCommands: flag(args, '--run-configured-commands'),
    yes: flag(args, '--yes') || flag(args, '-y')
  };
}
