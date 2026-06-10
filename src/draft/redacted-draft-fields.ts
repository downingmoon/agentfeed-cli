import type { LocalDraft } from '../types.js';
import { parseRedactedPatch, type PublicScanFields } from '../privacy/redacted-public-fields.js';

export interface RequiredRedactedDraftFields {
  title: string;
  summary: string;
  user_note: string | null;
  public_prompt: string | null;
  outcome: string[];
  timeline: LocalDraft['worklog']['timeline'];
  changed_areas: string[];
  tags: string[];
  project: LocalDraft['project'];
}

function missingRedactedField(field: string): Error {
  return new Error(`Redacted public draft fields missing ${field}.`);
}

function requireField<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw missingRedactedField(field);
  return value;
}

export function parseRequiredRedactedDraftFields(redacted: PublicScanFields): RequiredRedactedDraftFields {
  const patch = parseRedactedPatch(redacted);
  return {
    title: requireField(patch.title, 'title'),
    summary: requireField(patch.summary, 'summary'),
    user_note: requireField(patch.user_note, 'user_note'),
    public_prompt: patch.public_prompt ?? null,
    outcome: requireField(patch.outcome, 'outcome'),
    timeline: requireField(patch.timeline, 'timeline'),
    changed_areas: requireField(patch.changed_areas, 'changed_areas'),
    tags: requireField(patch.tags, 'tags'),
    project: requireField(patch.project, 'project'),
  };
}
