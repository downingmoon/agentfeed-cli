import { discardCompleteNextActions, discardConfirmationNextActions } from './draft-navigation-actions.js';
import { renderGuidedNextCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type DiscardFilePresence = {
  readonly draftId: string;
  readonly hadJson: boolean;
  readonly hadMarkdown: boolean;
};

export type DiscardConfirmationPayload = {
  readonly confirmation_required: true;
  readonly deleted: false;
  readonly draft_id: string;
  readonly files: {
    readonly json: { readonly existed: boolean; readonly will_remove: boolean; readonly removed: false };
    readonly markdown: { readonly existed: boolean; readonly will_remove: boolean; readonly removed: false };
  };
  readonly next_actions: readonly string[];
};

export type DiscardCompletePayload = {
  readonly confirmation_required: false;
  readonly deleted: true;
  readonly draft_id: string;
  readonly files: {
    readonly json: { readonly existed: boolean; readonly removed: boolean };
    readonly markdown: { readonly existed: boolean; readonly removed: boolean };
  };
  readonly next_actions: readonly string[];
};

export type DiscardCommandStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
};

const DEFAULT_STYLE: DiscardCommandStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command
};

export function discardConfirmationPayload(input: DiscardFilePresence): DiscardConfirmationPayload {
  return {
    confirmation_required: true,
    deleted: false,
    draft_id: input.draftId,
    files: {
      json: { existed: input.hadJson, will_remove: input.hadJson, removed: false },
      markdown: { existed: input.hadMarkdown, will_remove: input.hadMarkdown, removed: false }
    },
    next_actions: discardConfirmationNextActions(input.draftId)
  };
}

export function discardCompletePayload(input: DiscardFilePresence): DiscardCompletePayload {
  return {
    confirmation_required: false,
    deleted: true,
    draft_id: input.draftId,
    files: {
      json: { existed: input.hadJson, removed: input.hadJson },
      markdown: { existed: input.hadMarkdown, removed: input.hadMarkdown }
    },
    next_actions: discardCompleteNextActions()
  };
}

export function renderDiscardConfirmationHumanLines(
  input: DiscardFilePresence,
  style: DiscardCommandStyle = DEFAULT_STYLE
): string[] {
  return [
    style.heading('AgentFeed discard paused'),
    'Discard confirmation required.',
    'No local draft files were deleted.',
    '',
    style.section('Summary'),
    `Draft: ${input.draftId}`,
    `JSON: ${input.hadJson ? 'will be removed' : 'not found'}`,
    `Markdown: ${input.hadMarkdown ? 'will be removed' : 'not found'}`,
    '',
    style.section('Next'),
    'Delete this local draft after reviewing it:',
    `  ${style.command(`agentfeed discard --id ${input.draftId} --yes`)}`,
    'Or preview it first:',
    `  ${style.command(`agentfeed preview --id ${input.draftId}`)}`
  ];
}

export function renderDiscardCompleteHumanLines(
  input: DiscardFilePresence,
  style: DiscardCommandStyle = DEFAULT_STYLE
): string[] {
  return [
    style.heading('AgentFeed draft discarded'),
    `Discarded draft: ${input.draftId}`,
    '',
    style.section('Summary'),
    `Draft: ${input.draftId}`,
    `JSON: ${input.hadJson ? 'removed' : 'not found'}`,
    `Markdown: ${input.hadMarkdown ? 'removed' : 'not found'}`,
    '',
    style.section('Next'),
    ...renderGuidedNextCommandLines({ commands: discardCompleteNextActions(), command: style.command })
  ];
}
