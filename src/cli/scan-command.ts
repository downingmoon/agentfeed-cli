import { collectGitMetrics } from '../collectors/git.js';
import { readDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { changedAreas } from '../summary/changed-areas.js';
import { applyRedactedPublicFields, publicScanFieldsFromDraft, type PublicScanFields } from '../privacy/draft-sanitizer.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import type { PrivacyScanOutputOptions } from './privacy-scan-output.js';

export type PrivacyScanCommandInput = {
  readonly cwd: string;
  readonly dryRun: boolean;
  readonly path?: string;
  readonly draftId?: string;
};

export type PrivacyScanCommandResult = {
  readonly input: PublicScanFields;
  readonly result: ReturnType<typeof scanAndRedactFields<PublicScanFields>>;
  readonly options: PrivacyScanOutputOptions;
};

async function scanPath(path: string, dryRun: boolean): Promise<PrivacyScanCommandResult> {
  const git = await collectGitMetrics(path);
  const input: PublicScanFields = { changed_areas: changedAreas(git.changed_files) };
  return {
    input,
    result: scanAndRedactFields(input),
    options: { dryRun, path }
  };
}

async function scanDraft(cwd: string, draftId: string, dryRun: boolean): Promise<PrivacyScanCommandResult> {
  const draft = await readDraft(cwd, draftId);
  const input = publicScanFieldsFromDraft(draft);
  const result = scanAndRedactFields(input);
  if (!dryRun) {
    applyRedactedPublicFields(draft, result.redacted);
    draft.privacy_scan = result.scan;
    await writeDraft(cwd, draft);
  }
  return {
    input,
    result,
    options: { dryRun, draftId }
  };
}

export async function runPrivacyScanCommand(input: PrivacyScanCommandInput): Promise<PrivacyScanCommandResult> {
  if (input.path) return scanPath(input.path, input.dryRun);
  if (!input.draftId) throw new Error('Draft id is required for draft privacy scan.');
  return scanDraft(input.cwd, input.draftId, input.dryRun);
}
