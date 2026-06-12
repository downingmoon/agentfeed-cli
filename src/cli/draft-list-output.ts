import { draftListNextActions } from './draft-navigation-actions.js';
import { renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type DraftListRow = {
  readonly id: string;
  readonly path: string;
  readonly updated_at: string;
  readonly valid: boolean;
  readonly project?: string;
  readonly title?: string;
  readonly agent?: string;
  readonly status?: 'pending' | 'uploaded';
  readonly privacy?: string;
  readonly findings?: number;
  readonly metrics?: string;
  readonly review_url?: string | null;
  readonly error?: string;
};

export type DraftListSummary = {
  readonly total: number;
  readonly valid: number;
  readonly invalid: number;
  readonly pending: number;
  readonly uploaded: number;
};

export type DraftListJsonOutput = {
  readonly summary: DraftListSummary;
  readonly drafts: readonly DraftListRow[];
  readonly next_actions: readonly string[];
};

function safeTerminalText(value: string | null | undefined): string {
  return ui.sanitizeTerminalText(value ?? '');
}

export function draftListSummary(rows: readonly DraftListRow[]): DraftListSummary {
  const validRows = rows.filter((row) => row.valid);
  return {
    total: rows.length,
    valid: validRows.length,
    invalid: rows.length - validRows.length,
    pending: validRows.filter((row) => row.status === 'pending').length,
    uploaded: validRows.filter((row) => row.status === 'uploaded').length
  };
}

function draftListSummaryLines(summary: DraftListSummary): readonly string[] {
  const lines = [
    ui.section('Summary'),
    `Total: ${summary.total}`,
    `Pending upload: ${summary.pending}`,
    `Uploaded: ${summary.uploaded}`
  ];
  if (summary.invalid > 0) lines.push(ui.warn(`Invalid: ${summary.invalid}`));
  lines.push('Order: newest first');
  return lines;
}

function formatRelativeTime(value: string, now: number): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;

  const deltaMs = parsed - now;
  const absMs = Math.abs(deltaMs);
  const future = deltaMs > 0;
  const suffix = future ? 'from now' : 'ago';

  if (absMs < 60_000) return future ? 'in less than 1m' : 'just now';
  const minutes = Math.floor(absMs / 60_000);
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ${suffix}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return future ? `in ${days}d` : `${days}d ${suffix}`;
  const months = Math.floor(days / 30);
  if (months < 12) return future ? `in ${months}mo` : `${months}mo ${suffix}`;
  const years = Math.floor(days / 365);
  return future ? `in ${years}y` : `${years}y ${suffix}`;
}

export function formatDraftUpdatedAt(value: string, now = Date.now()): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return `${new Date(parsed).toISOString()} (${formatRelativeTime(value, now)})`;
}

export function draftListJsonOutput(rows: readonly DraftListRow[]): DraftListJsonOutput {
  return {
    summary: draftListSummary(rows),
    drafts: rows,
    next_actions: draftListNextActions(rows)
  };
}

function draftListRowLines(row: DraftListRow, now: number): readonly string[] {
  if (!row.valid) {
    return [
      `${row.id}  invalid`,
      `  Updated: ${formatDraftUpdatedAt(row.updated_at, now)}`,
      `  Error: ${row.error}`
    ];
  }
  const lines = [
    `${safeTerminalText(row.id)}  ${safeTerminalText(row.status)}  ${safeTerminalText(row.agent)}  ${safeTerminalText(row.privacy)} · findings ${row.findings}`,
    `  Updated: ${formatDraftUpdatedAt(row.updated_at, now)}`,
    `  Project: ${safeTerminalText(row.project)}`,
    `  Title: ${safeTerminalText(row.title)}`,
    ...ui.wrapKeyValue('  Metrics', row.metrics ?? 'no metrics')
  ];
  if (row.status === 'uploaded') {
    lines.push(`  Open: ${ui.command(`agentfeed open --id ${row.id}`)}`);
  } else {
    lines.push(`  Upload: ${ui.command(`agentfeed publish --id ${row.id} --yes`)}`);
  }
  return lines;
}

export function renderDraftListHumanLines(rows: readonly DraftListRow[], now = Date.now()): readonly string[] {
  const nextActions = draftListNextActions(rows);
  const lines = [ui.heading(`AgentFeed drafts (${rows.length})`)];
  if (!rows.length) {
    lines.push('', 'No local drafts found.', '', ui.section('Next'), ...renderRecommendedCommandLines({ commands: nextActions, command: ui.command }));
    return lines;
  }

  lines.push('', ...draftListSummaryLines(draftListSummary(rows)), '');
  for (const row of rows) lines.push(...draftListRowLines(row, now));
  lines.push('', ui.section('Next'), ...renderRecommendedCommandLines({ commands: nextActions, command: ui.command }));
  return lines;
}
