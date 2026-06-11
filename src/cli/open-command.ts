import { openNextActions } from './draft-navigation-actions.js';

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

export function openJsonPayload(input: OpenCommandPayloadInput): OpenCommandPayload {
  return {
    draft_id: input.draftId,
    review_url: input.reviewUrl,
    opened: input.opened,
    warnings: input.warnings,
    next_actions: openNextActions(input.draftId)
  };
}
