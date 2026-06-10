import type { LocalDraft, PrivacyScanResult } from '../types.js';
import { parseRedactedPatch, type PublicScanFields } from './redacted-public-fields.js';
import { scanAndRedactFields } from './scan.js';
import { stripUrlUserInfo } from './url.js';

export type { PublicScanFields } from './redacted-public-fields.js';

export function publicScanFieldsFromDraft(draft: LocalDraft): PublicScanFields {
  return {
    title: draft.worklog.title,
    summary: draft.worklog.summary,
    user_note: draft.worklog.user_note ?? null,
    model: draft.worklog.model ?? null,
    metrics: draft.worklog.metrics,
    public_prompt: draft.worklog.public_prompt ?? null,
    outcome: draft.worklog.outcome,
    timeline: draft.worklog.timeline,
    changed_areas: draft.worklog.changed_areas,
    tags: draft.worklog.tags,
    project: { ...draft.project, repository_url: stripUrlUserInfo(draft.project.repository_url) }
  };
}

export function applyRedactedPublicFields(draft: LocalDraft, redacted: PublicScanFields): void {
  const patch = parseRedactedPatch(redacted);
  if (patch.title !== undefined) draft.worklog.title = patch.title;
  if (patch.summary !== undefined) draft.worklog.summary = patch.summary;
  if (patch.user_note !== undefined) draft.worklog.user_note = patch.user_note;
  if (patch.model !== undefined) draft.worklog.model = patch.model;
  if (patch.metrics !== undefined) draft.worklog.metrics = patch.metrics;
  if (patch.public_prompt !== undefined) draft.worklog.public_prompt = patch.public_prompt;
  if (patch.outcome !== undefined) draft.worklog.outcome = patch.outcome;
  if (patch.timeline !== undefined) draft.worklog.timeline = patch.timeline;
  if (patch.changed_areas !== undefined) draft.worklog.changed_areas = patch.changed_areas;
  if (patch.tags !== undefined) draft.worklog.tags = patch.tags;
  if (patch.project !== undefined) draft.project = patch.project;
}

function stripUploadOnlyPrivacySamples(scan: PrivacyScanResult): PrivacyScanResult {
  return {
    ...scan,
    findings: scan.findings.map(({ sample_redacted: _sampleRedacted, ...finding }) => finding),
  };
}

export function scanAndRedactDraftPublicFields(draft: LocalDraft, options: { preserveResolvedFindings?: boolean } = {}): PrivacyScanResult {
  const previousScan = draft.privacy_scan;
  const { redacted, scan } = scanAndRedactFields(publicScanFieldsFromDraft(draft));
  applyRedactedPublicFields(draft, redacted);
  draft.privacy_scan = options.preserveResolvedFindings && scan.findings.length === 0 && previousScan.findings.length > 0
    ? previousScan
    : scan;
  return draft.privacy_scan;
}

export function sanitizedDraftForUpload(draft: LocalDraft): LocalDraft {
  const safeDraft: LocalDraft = structuredClone(draft);
  scanAndRedactDraftPublicFields(safeDraft, { preserveResolvedFindings: true });
  safeDraft.privacy_scan = stripUploadOnlyPrivacySamples(safeDraft.privacy_scan);
  return safeDraft;
}
