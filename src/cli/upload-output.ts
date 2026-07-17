import type { CachedUploadReuseFailureReason, PublishDraftResult } from '../api/client.js';
import type { LocalDraft, ReviewUrlHandoff } from '../types.js';
import { renderGuidedNextCommandLines } from './guided-next-command-renderer.js';
import { reviewUrlHandoffLines } from './review-handoff.js';
import { uploadNextActions } from './upload-guidance.js';
import * as ui from './ui.js';

export type UploadResultLineOptions = {
  readonly heading: string;
  readonly message: string;
  readonly draftId: string;
  readonly result: PublishDraftResult;
  readonly handoff: ReviewUrlHandoff;
  readonly privacyPolicyLines?: readonly string[];
};

export type UploadConfirmationLineOptions = {
  readonly cacheReuseReason?: CachedUploadReuseFailureReason;
};

function urlBlockLines(label: string, url: string): string[] {
  return [`${label}:`, `  ${ui.command(url)}`];
}

function cachedUploadReuseReasonLabel(reason: CachedUploadReuseFailureReason): string {
  switch (reason) {
    case 'missing_upload_marker': return 'no saved private review upload marker is present';
    case 'missing_worklog_id': return 'saved upload metadata is missing the worklog id';
    case 'missing_review_url': return 'saved upload metadata is missing the review URL';
    case 'missing_payload_hash': return 'saved upload metadata is missing the redacted payload hash';
    case 'missing_credential_binding': return 'saved upload metadata is missing the credential binding';
    case 'base_url_mismatch': return 'saved upload was created for a different API base URL';
    case 'invalid_review_url': return 'saved review URL is no longer trusted for the current API/review origin';
    case 'payload_hash_mismatch': return 'local draft content changed after the saved upload';
    case 'credential_binding_mismatch': return 'saved upload was created with a different token or user binding';
  }
}

export function renderUploadResultLines(options: UploadResultLineOptions): string[] {
  const lines = [ui.heading(options.heading), options.message];
  const privacyPolicyLines = options.privacyPolicyLines ?? [];
  if (privacyPolicyLines.length) {
    lines.push('', ui.section('Policy'), ...privacyPolicyLines);
  }

  lines.push(
    '',
    ui.section('Summary'),
    `Draft: ${options.draftId}`,
    `Status: ${options.result.status}`,
    ...urlBlockLines('Review URL', options.result.review_url)
  );

  const handoffLines = reviewUrlHandoffLines(options.handoff, options.result.review_url);
  if (handoffLines.length) {
    lines.push('', ui.section('Handoff'), ...handoffLines);
  }

  lines.push(
    '',
    ui.section('Next'),
    ...renderGuidedNextCommandLines({ commands: uploadNextActions(options.draftId), command: ui.command })
  );
  return lines;
}

export function renderUploadConfirmationRequiredLines(
  draft: LocalDraft,
  command: string,
  extraCommand?: string,
  options: UploadConfirmationLineOptions = {}
): string[] {
  const lines = [
    ui.heading('AgentFeed upload paused'),
    'Upload confirmation required.',
    'No data was uploaded to AgentFeed.'
  ];
  if (options.cacheReuseReason) {
    lines.push(
      '',
      ui.section('Warnings'),
      `Saved private review cache cannot be reused: ${cachedUploadReuseReasonLabel(options.cacheReuseReason)}.`
    );
  }

  lines.push(
    '',
    ui.section('Summary'),
    `Draft: ${draft.id}`,
    `Project: ${draft.project.name}`,
    `Title: ${draft.worklog.title}`,
    `Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`,
    '',
    ui.section('Review before upload'),
    `Preview: ${ui.command(`agentfeed preview --id ${draft.id}`)}`,
    `Privacy: ${draft.privacy_scan.findings.length ? 'review findings before public sharing' : 'no findings detected'}`,
    'Target: private AgentFeed review draft',
    'Safety: upload happens only after you answer yes or rerun with --yes.',
    '',
    ui.section('Next'),
    'Upload after reviewing this draft:',
    `  ${ui.command(command)}`
  );

  if (extraCommand) {
    lines.push('Or collect and upload in one command:', `  ${ui.command(extraCommand)}`);
  }
  return lines;
}
