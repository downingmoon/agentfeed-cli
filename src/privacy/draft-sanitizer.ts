import type { LocalDraft, PrivacyScanResult } from '../types.js';
import { scanAndRedactFields } from './scan.js';
import { stripUrlUserInfo } from './url.js';

export type PublicScanFields = Record<string, unknown>;

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
  if (typeof redacted.title === 'string') draft.worklog.title = redacted.title;
  if (typeof redacted.summary === 'string') draft.worklog.summary = redacted.summary;
  if (typeof redacted.user_note === 'string' || redacted.user_note == null) draft.worklog.user_note = redacted.user_note as string | null;
  if (typeof redacted.model === 'string' || redacted.model == null) draft.worklog.model = redacted.model as string | null;
  if (redacted.metrics && typeof redacted.metrics === 'object') draft.worklog.metrics = redacted.metrics as LocalDraft['worklog']['metrics'];
  if (typeof redacted.public_prompt === 'string' || redacted.public_prompt == null) draft.worklog.public_prompt = redacted.public_prompt as string | null;
  if (Array.isArray(redacted.outcome)) draft.worklog.outcome = redacted.outcome as string[];
  if (Array.isArray(redacted.timeline)) draft.worklog.timeline = redacted.timeline as LocalDraft['worklog']['timeline'];
  if (Array.isArray(redacted.changed_areas)) draft.worklog.changed_areas = redacted.changed_areas as string[];
  if (Array.isArray(redacted.tags)) draft.worklog.tags = redacted.tags as string[];
  if (redacted.project && typeof redacted.project === 'object') {
    draft.project = redacted.project as LocalDraft['project'];
    draft.project.repository_url = stripUrlUserInfo(draft.project.repository_url);
  }
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
  const safeDraft = structuredClone(draft) as LocalDraft;
  scanAndRedactDraftPublicFields(safeDraft, { preserveResolvedFindings: true });
  return safeDraft;
}
