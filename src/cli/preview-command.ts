import type { RemotePreviewResult } from '../api/client.js';
import type { LocalDraft } from '../types.js';
import { previewNextActions, remotePreviewNextActions } from './draft-next-actions.js';

export type LocalPreviewJsonPayload = LocalDraft & {
  readonly next_actions: readonly string[];
};

export type RemotePreviewJsonPayload = RemotePreviewResult & {
  readonly draft_id: string;
  readonly next_actions: readonly string[];
};

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
