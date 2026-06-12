import { formatCollectionExplain } from '../draft/explain.js';
import type { LocalDraft } from '../types.js';
import { collectJsonNextActions } from './draft-next-actions.js';
import { formatWarningLines } from './diagnostic-formatters.js';
import { renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import { formatMetricsRow } from './share.js';
import * as ui from './ui.js';

export type CollectOutputInput = {
  readonly draft: LocalDraft;
  readonly warnings: readonly string[];
};

export type CollectHumanOutputInput = CollectOutputInput & {
  readonly reusedExisting: boolean;
  readonly dryRun: boolean;
  readonly explain: boolean;
};

export type CollectJsonPayload = LocalDraft & {
  readonly warnings: readonly string[];
  readonly next_actions: readonly string[];
};

export type CollectOutputStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
};

const DEFAULT_STYLE: CollectOutputStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command
};

export function collectJsonPayload(input: CollectOutputInput): CollectJsonPayload {
  return {
    ...input.draft,
    warnings: input.warnings,
    next_actions: collectJsonNextActions(input.draft)
  };
}

export function renderCollectHumanLines(input: CollectHumanOutputInput, style: CollectOutputStyle = DEFAULT_STYLE): string[] {
  const lines = [
    style.heading(input.reusedExisting ? 'AgentFeed draft reused' : 'AgentFeed draft ready'),
    input.reusedExisting ? 'Existing matching draft reused.' : 'Draft created.',
    ''
  ];
  if (input.warnings.length) {
    lines.push(style.section('Warnings'), ...input.warnings.flatMap((warning) => formatWarningLines(warning)), '');
  }
  lines.push(
    style.section('Summary'),
    `ID: ${safeTerminalText(input.draft.id)}`,
    `Project: ${safeTerminalText(input.draft.project.name)}`,
    `Title: ${singleLine(input.draft.worklog.title)}`,
    `Privacy: ${safeTerminalText(input.draft.privacy_scan.status)}`,
    ...(input.dryRun ? ['Mode: dry run (local draft only; no upload attempted)'] : []),
    '',
    style.section('Signals'),
    `Agent: ${safeTerminalText(input.draft.worklog.agent)}`,
    ...collectModelLines(input.draft),
    ...ui.wrapKeyValue('Metrics', formatMetricsRow(input.draft))
  );
  if (input.explain) {
    lines.push('', style.section('Collection'), formatCollectionExplain(input.draft));
  }
  lines.push('', style.section('Next'), ...renderRecommendedCommandLines({ commands: collectJsonNextActions(input.draft), command: style.command }));
  return lines;
}

export function renderCollectAutoUploadIgnoredWarningLines(style: CollectOutputStyle = DEFAULT_STYLE): string[] {
  return [
    '',
    style.section('Warnings'),
    'Note: collection.auto_upload is ignored by collect for safety. Use agentfeed collect --upload to upload explicitly.'
  ];
}

function collectModelLines(draft: LocalDraft): string[] {
  const models = draftModelsLabel(draft);
  return models ? [`Models: ${safeTerminalText(models)}`] : [];
}

function draftModelsLabel(draft: LocalDraft): string | null {
  const models = draft.worklog.metrics.models_used?.length
    ? draft.worklog.metrics.models_used
    : draft.worklog.model ? [draft.worklog.model] : [];
  return models.length ? models.join(', ') : null;
}

function singleLine(value: string): string {
  const text = safeTerminalText(value).replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function safeTerminalText(value: string): string {
  return ui.sanitizeTerminalText(value);
}
