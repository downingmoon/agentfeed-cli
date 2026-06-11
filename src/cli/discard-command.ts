import { discardCompleteNextActions, discardConfirmationNextActions } from './draft-navigation-actions.js';

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
