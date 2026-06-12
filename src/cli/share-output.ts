import type { PublishDraftResult } from '../api/client.js';
import { formatCollectionExplain } from '../draft/explain.js';
import type { LocalDraft, ReviewUrlHandoff } from '../types.js';
import { shareDryRunNextActions } from './draft-navigation-actions.js';
import { renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import { privacyPolicySummary, type PrivacyPolicySummary } from './share.js';
import { uploadNextActions } from './upload-guidance.js';
import * as ui from './ui.js';

export type ShareUploadSkipped = {
  readonly reason: 'token_missing';
  readonly next_action: 'agentfeed login';
};

export type ShareLocalJsonPayload = {
  readonly dry_run: boolean;
  readonly upload_skipped: ShareUploadSkipped | null;
  readonly reused_existing_draft: boolean;
  readonly draft: LocalDraft;
  readonly privacy_policy: PrivacyPolicySummary;
  readonly warnings: readonly string[];
  readonly next_actions: readonly string[];
  readonly collection_explain?: string;
};

export type ShareUploadedJsonPayload = {
  readonly dry_run: false;
  readonly reused_existing_draft: boolean;
  readonly draft_id: string;
  readonly draft: LocalDraft;
  readonly upload: PublishDraftResult;
  readonly privacy_policy: PrivacyPolicySummary;
  readonly handoff: ReviewUrlHandoff;
  readonly warnings: readonly string[];
  readonly next_actions: readonly string[];
  readonly collection_explain?: string;
};

export type ShareLocalJsonPayloadInput = {
  readonly dryRun: boolean;
  readonly hasCredentials: boolean;
  readonly reusedExistingDraft: boolean;
  readonly draft: LocalDraft;
  readonly warnings: readonly string[];
  readonly explain: boolean;
};

export type ShareUploadedJsonPayloadInput = {
  readonly reusedExistingDraft: boolean;
  readonly draft: LocalDraft;
  readonly upload: PublishDraftResult;
  readonly handoff: ReviewUrlHandoff;
  readonly warnings: readonly string[];
  readonly explain: boolean;
};

export type ShareLocalNextLinesInput = {
  readonly dryRun: boolean;
  readonly draftId: string;
  readonly hasCredentials: boolean;
};

function uploadSkipped(dryRun: boolean): ShareUploadSkipped | null {
  if (dryRun) return null;
  return { reason: 'token_missing', next_action: 'agentfeed login' };
}

export function shareLocalJsonPayload(input: ShareLocalJsonPayloadInput): ShareLocalJsonPayload {
  return {
    dry_run: input.dryRun,
    upload_skipped: uploadSkipped(input.dryRun),
    reused_existing_draft: input.reusedExistingDraft,
    draft: input.draft,
    privacy_policy: privacyPolicySummary(input.draft),
    warnings: input.warnings,
    next_actions: shareDryRunNextActions(input.draft.id, input.hasCredentials),
    ...(input.explain ? { collection_explain: formatCollectionExplain(input.draft) } : {})
  };
}

export function shareUploadedJsonPayload(input: ShareUploadedJsonPayloadInput): ShareUploadedJsonPayload {
  return {
    dry_run: false,
    reused_existing_draft: input.reusedExistingDraft,
    draft_id: input.draft.id,
    draft: input.draft,
    upload: input.upload,
    privacy_policy: privacyPolicySummary(input.draft),
    handoff: input.handoff,
    warnings: input.warnings,
    next_actions: uploadNextActions(input.draft.id),
    ...(input.explain ? { collection_explain: formatCollectionExplain(input.draft) } : {})
  };
}

export function renderShareLocalNextLines(input: ShareLocalNextLinesInput): string[] {
  return [
    ui.section('Next'),
    input.dryRun
      ? `Dry run complete. Local draft kept: ${input.draftId}`
      : `Upload skipped: AgentFeed token is missing. Local draft kept: ${input.draftId}`,
    ...renderRecommendedCommandLines({ commands: shareDryRunNextActions(input.draftId, input.hasCredentials), command: ui.command })
  ];
}
