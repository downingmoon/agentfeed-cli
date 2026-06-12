import { readDraft, type listDrafts } from '../draft/read.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import type { LocalDraft } from '../types.js';
import type { DraftListRow } from './draft-list-output.js';
import { formatMetricsRow } from './share.js';
import * as ui from './ui.js';

type DraftListFileRow = Awaited<ReturnType<typeof listDrafts>>[number];

function singleLine(value: string): string {
  const text = ui.sanitizeTerminalText(value).replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export function safeDraftListTitle(draft: LocalDraft): string {
  const result = scanAndRedactFields({ title: draft.worklog.title });
  return singleLine(String(result.redacted.title ?? draft.worklog.title));
}

export async function buildDraftListRow(cwd: string, row: DraftListFileRow): Promise<DraftListRow> {
  const updatedAt = new Date(row.mtimeMs).toISOString();
  try {
    const draft = await readDraft(cwd, row.id);
    return {
      id: row.id,
      path: row.path,
      updated_at: updatedAt,
      valid: true,
      project: draft.project.name,
      title: safeDraftListTitle(draft),
      agent: draft.worklog.agent,
      status: draft.upload.uploaded ? 'uploaded' : 'pending',
      privacy: draft.privacy_scan.status,
      findings: draft.privacy_scan.findings.length,
      metrics: formatMetricsRow(draft),
      review_url: draft.upload.review_url ?? null
    };
  } catch (error) {
    return {
      id: row.id,
      path: row.path,
      updated_at: updatedAt,
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
