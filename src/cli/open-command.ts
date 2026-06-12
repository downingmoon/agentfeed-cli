import { openNextActions } from './draft-navigation-actions.js';
import { renderGuidedNextCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type OpenCommandPayloadInput = {
  readonly draftId: string;
  readonly reviewUrl: string;
  readonly opened: boolean;
  readonly warnings: readonly string[];
};

export type OpenCommandPayload = {
  readonly draft_id: string;
  readonly review_url: string;
  readonly opened: boolean;
  readonly warnings: readonly string[];
  readonly next_actions: readonly string[];
};

export type OpenCommandStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
  readonly warn: (text: string) => string;
};

const DEFAULT_STYLE: OpenCommandStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command,
  warn: ui.warn
};

export function openJsonPayload(input: OpenCommandPayloadInput): OpenCommandPayload {
  return {
    draft_id: input.draftId,
    review_url: input.reviewUrl,
    opened: input.opened,
    warnings: input.warnings,
    next_actions: openNextActions(input.draftId)
  };
}

export function notUploadedDraftMessage(draftId: string): string {
  return [
    `Draft has not been uploaded yet: ${draftId}`,
    `Run: agentfeed publish --id ${draftId} --yes`,
    `Run: agentfeed preview --id ${draftId}`,
    'Run: agentfeed drafts'
  ].join('\n');
}

export function noUploadedDraftsMessage(latestDraftId: string): string {
  return [
    'No uploaded local drafts found.',
    `Newest draft: ${latestDraftId}`,
    `Run: agentfeed publish --id ${latestDraftId} --yes`,
    'Run: agentfeed share --yes',
    'Run: agentfeed drafts'
  ].join('\n');
}

export function noOpenableDraftsMessage(): string {
  return [
    'No uploaded review drafts found.',
    '',
    'Create and review a draft first:',
    'Run: agentfeed share --dry',
    'Run: agentfeed publish --latest --yes',
    '',
    'Or inspect saved drafts:',
    'Run: agentfeed drafts'
  ].join('\n');
}

export function renderOpenHumanLines(
  input: OpenCommandPayloadInput,
  style: OpenCommandStyle = DEFAULT_STYLE
): string[] {
  return [
    style.heading(input.opened ? 'AgentFeed review opened' : 'AgentFeed review URL'),
    input.opened ? 'Opened review URL.' : 'Browser open failed. Open this URL manually:',
    '',
    style.section('Summary'),
    `Draft: ${input.draftId}`,
    ...renderUrlBlockLines('Review URL', input.reviewUrl, style),
    ...renderOpenWarningSectionLines(input.warnings, style),
    style.section('Next'),
    ...renderGuidedNextCommandLines({ commands: openNextActions(input.draftId), command: style.command })
  ];
}

function renderUrlBlockLines(label: string, url: string, style: OpenCommandStyle): string[] {
  return [
    `${label}:`,
    `  ${style.command(url)}`
  ];
}

function renderOpenWarningSectionLines(warnings: readonly string[], style: OpenCommandStyle): string[] {
  if (!warnings.length) return [''];
  return [
    '',
    style.section('Warnings'),
    ...warnings.flatMap((warning) => ui.wrapKeyValue('Warning', warning).map((line) => style.warn(line))),
    ''
  ];
}
