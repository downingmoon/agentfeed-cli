import type { RemotePreviewResult } from '../api/client.js';
import type { LocalDraft } from '../types.js';
import { formatMetricsRow } from './share.js';
import { previewNextActions, remotePreviewNextActions } from './draft-next-actions.js';
import { renderGuidedNextCommandLines, renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type PreviewTextFormatters = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
};

export type LocalPreviewJsonPayload = LocalDraft & {
  readonly next_actions: readonly string[];
};

export type RemotePreviewJsonPayload = RemotePreviewResult & {
  readonly draft_id: string;
  readonly next_actions: readonly string[];
};

const DEFAULT_TEXT_FORMATTERS: PreviewTextFormatters = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command
};

function safeTerminalText(value: string | null | undefined): string {
  return ui.sanitizeTerminalText(value ?? '');
}

function singleLine(value: string): string {
  const text = safeTerminalText(value).replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function reviewUrlLines(label: string, url: string, formatters: PreviewTextFormatters): string[] {
  return [
    `${label}:`,
    `  ${formatters.command(url)}`
  ];
}

export function localPreviewJsonPayload(draft: LocalDraft): LocalPreviewJsonPayload {
  return {
    ...draft,
    next_actions: previewNextActions(draft)
  };
}

export function remotePreviewJsonPayload(input: { readonly draftId: string; readonly remote: RemotePreviewResult }): RemotePreviewJsonPayload {
  return {
    draft_id: input.draftId,
    ...input.remote,
    next_actions: remotePreviewNextActions(input.draftId, input.remote.valid)
  };
}

export function renderRemotePreviewHumanLines(
  input: { readonly draftId: string; readonly draftTitle: string; readonly remote: RemotePreviewResult },
  formatters: PreviewTextFormatters = DEFAULT_TEXT_FORMATTERS
): string[] {
  return [
    formatters.heading('AgentFeed remote preview'),
    '',
    formatters.section('Summary'),
    `Remote preview: ${input.remote.valid ? 'valid' : 'invalid'}`,
    `Warnings: ${input.remote.warnings.length ? input.remote.warnings.join(', ') : 'none'}`,
    `Title: ${singleLine(String(input.remote.preview.title ?? input.draftTitle))}`,
    '',
    formatters.section('Next'),
    ...renderGuidedNextCommandLines({
      commands: remotePreviewNextActions(input.draftId, input.remote.valid),
      command: formatters.command
    })
  ];
}

export function renderLocalPreviewHumanLines(draft: LocalDraft, formatters: PreviewTextFormatters = DEFAULT_TEXT_FORMATTERS): string[] {
  const uploadStatus = draft.upload.uploaded ? 'uploaded' : 'pending';
  return [
    formatters.heading('AgentFeed preview'),
    '',
    `@local · ${safeTerminalText(draft.worklog.agent)} · ${safeTerminalText(draft.project.name)}`,
    '',
    formatters.section('Summary'),
    `ID: ${draft.id}`,
    `Title: ${singleLine(draft.worklog.title)}`,
    ...ui.wrapKeyValue('Summary', singleLine(draft.worklog.summary)),
    '',
    formatters.section('Details'),
    ...ui.wrapKeyValue('Metrics', formatMetricsRow(draft)),
    `Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`,
    `Upload: ${uploadStatus}`,
    ...(draft.upload.review_url ? reviewUrlLines('Review URL', draft.upload.review_url, formatters) : []),
    '',
    formatters.section('Next'),
    ...renderRecommendedCommandLines({ commands: previewNextActions(draft), command: formatters.command })
  ];
}
