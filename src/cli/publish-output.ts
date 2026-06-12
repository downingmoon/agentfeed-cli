import type { PublishDraftResult } from '../api/client.js';
import type { LocalDraft, ReviewUrlHandoff } from '../types.js';
import { formatPrivacyPolicyLines, privacyPolicySummary, type PrivacyPolicySummary } from './share.js';
import { uploadNextActions } from './upload-guidance.js';
import { renderUploadResultLines } from './upload-output.js';

export type PublishJsonPayload = {
  readonly draft_id: string;
  readonly upload: PublishDraftResult;
  readonly privacy_policy: PrivacyPolicySummary;
  readonly handoff: ReviewUrlHandoff;
  readonly next_actions: readonly string[];
};

export type PublishJsonPayloadInput = {
  readonly draft: LocalDraft;
  readonly upload: PublishDraftResult;
  readonly handoff: ReviewUrlHandoff;
};

export type PublishUploadResultLinesInput = {
  readonly draft: LocalDraft;
  readonly upload: PublishDraftResult;
  readonly handoff: ReviewUrlHandoff;
};

export function publishJsonPayload(input: PublishJsonPayloadInput): PublishJsonPayload {
  return {
    draft_id: input.draft.id,
    upload: input.upload,
    privacy_policy: privacyPolicySummary(input.draft),
    handoff: input.handoff,
    next_actions: uploadNextActions(input.draft.id)
  };
}


export function renderPublishUploadResultLines(input: PublishUploadResultLinesInput): string[] {
  return renderUploadResultLines({
    heading: input.upload.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: input.upload.reused_existing ? 'Private review draft already uploaded; reusing existing review URL.' : 'Private review draft uploaded.',
    draftId: input.draft.id,
    result: input.upload,
    handoff: input.handoff,
    privacyPolicyLines: formatPrivacyPolicyLines(input.draft)
  });
}
