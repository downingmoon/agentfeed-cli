import type { AgentType, LocalDraft } from '../types.js';
import { collectionQualityLabel, formatCollectionGuidanceLines, formatCollectionWindowLine } from '../draft/collection-diagnostics.js';
import { formatTokenCount } from '../summary/metric-format.js';
import { flag, option } from './args.js';
import { parseAgentSource } from './source.js';
import * as ui from './ui.js';

export interface ShareOptions {
  dryRun: boolean;
  openReview: boolean;
  noOpenReview: boolean;
  json: boolean;
  explain: boolean;
  source?: AgentType;
  sessionFile?: string | null;
  since?: string | null;
  until?: string | null;
  note?: string | null;
  noClipboard: boolean;
  noSaveCursor: boolean;
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
  if (m.tokens_used != null) parts.push(formatTokenCount(m.tokens_used));
  return parts.length ? parts.join(' · ') : 'no metrics';
}

function modelsLabel(draft: LocalDraft): string | null {
  const models = draft.worklog.metrics.models_used?.length
    ? draft.worklog.metrics.models_used
    : draft.worklog.model ? [draft.worklog.model] : [];
  return models.length ? models.join(', ') : null;
}

function safeTerminalText(value: string): string {
  return ui.sanitizeTerminalText(value);
}

function formatAgentMetricLines(draft: LocalDraft): string[] {
  const metrics = draft.worklog.metrics.agent_metrics;
  if (!metrics?.length) return [];
  return [
    'Per-agent metrics:',
    ...metrics.map((metric) => {
      const parts = [
        metric.model ?? null,
        metric.tokens_used != null ? formatTokenCount(metric.tokens_used) : null,
        metric.files_changed != null ? `${metric.files_changed} files` : null,
        metric.lines_added != null || metric.lines_removed != null ? `+${metric.lines_added ?? 0} -${metric.lines_removed ?? 0}` : null,
        metric.tool_calls != null ? `${metric.tool_calls} tools` : null,
        metric.commands_run != null ? `${metric.commands_run} cmds` : null
      ].filter((part): part is string => Boolean(part));
      return ui.wrapKeyValue(`- ${safeTerminalText(metric.agent)}`, parts.length ? parts.join(' · ') : 'no metrics').join('\n');
    })
  ];
}

export function privacyPublicPublishBlocked(draft: LocalDraft): boolean {
  return draft.privacy_scan.status === 'danger'
    || draft.privacy_scan.findings.some((finding) => (finding.severity === 'high' || finding.severity === 'critical') && !finding.resolved);
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
    lines.push('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');
  }
  lines.push('Private review upload is allowed so you can resolve findings in the web review.');
  return lines;
}

export function formatSharePreview(draft: LocalDraft, options: { explainDetailsFollow?: boolean } = {}): string {
  const m = draft.worklog.metrics;
  const models = modelsLabel(draft);
  const changedAreas = draft.worklog.changed_areas.length ? draft.worklog.changed_areas.map(safeTerminalText).join(', ') : 'Application code';
  const lines = [
    ui.heading('AgentFeed share preview'),
    'Ready to share private review draft.',
    '',
    ui.section('Summary'),
    `Draft: ${safeTerminalText(draft.id)}`,
    `Project: ${safeTerminalText(draft.project.name)}`,
    `Title: ${safeTerminalText(draft.worklog.title)}`,
    ...ui.wrapKeyValue('Summary', draft.worklog.summary),
    ...(draft.worklog.user_note ? [`Note: ${safeTerminalText(draft.worklog.user_note)}`] : []),
    '',
    ui.section('Signals'),
    `Agent: ${safeTerminalText(draft.worklog.agent)}`,
    ...(models ? [`Models: ${safeTerminalText(models)}`] : []),
    ...ui.wrapKeyValue('Metrics', formatMetricsRow(draft)),
    ...ui.wrapKeyValue('Changed areas', changedAreas),
    `Privacy: ${safeTerminalText(draft.privacy_scan.status)} · findings ${draft.privacy_scan.findings.length}`
  ];
  const agentMetricLines = formatAgentMetricLines(draft);
  if (agentMetricLines.length) {
    lines.push('', ui.section('Per-agent metrics'), ...agentMetricLines.slice(1));
  }
  const privacyPolicyLines = formatPrivacyPolicyLines(draft);
  if (privacyPolicyLines.length) {
    lines.push('', ui.section('Policy'), ...privacyPolicyLines);
  }

  lines.push(
    '',
    ui.section('Collection'),
    `Collection quality: ${collectionQualityLabel(m)}`
  );
  const windowLine = formatCollectionWindowLine(draft.source.collection_window, draft.source.collection_window_reason);
  if (windowLine) lines.push(windowLine);
  if (options.explainDetailsFollow) {
    lines.push('Collection details: shown below');
  } else {
    if (m.collection_sources?.length) {
      lines.push('Collection sources:');
      for (const source of m.collection_sources) lines.push(`- ${safeTerminalText(source.type)}: ${safeTerminalText(source.name)} (${safeTerminalText(source.quality)})`);
    } else {
      lines.push('Collection sources: none');
    }
    lines.push(...formatCollectionGuidanceLines(m));
  }

  lines.push('', ui.section('Target'), 'Upload target: private AgentFeed review draft');
  return lines.join('\n');
}

export function parseShareArgs(args: string[]): ShareOptions {
  return {
    dryRun: flag(args, '--dry') || flag(args, '--dry-run'),
    openReview: flag(args, '--open-review'),
    noOpenReview: flag(args, '--no-open-review'),
    json: flag(args, '--json'),
    explain: flag(args, '--explain'),
    source: parseAgentSource(option(args, '--source'), 'share'),
    sessionFile: option(args, '--session-file') ?? null,
    since: option(args, '--since') ?? null,
    until: option(args, '--until') ?? null,
    note: option(args, '--note') ?? null,
    noClipboard: flag(args, '--no-clipboard') || flag(args, '--no-clip'),
    noSaveCursor: flag(args, '--no-save-cursor'),
    runConfiguredCommands: flag(args, '--run-configured-commands'),
    yes: flag(args, '--yes') || flag(args, '-y')
  };
}
