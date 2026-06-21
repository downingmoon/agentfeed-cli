import { writeDraft } from '../draft/write.js';
import { scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import type { LocalDraft } from '../types.js';

export async function sanitizeDraftForCliOutput(cwd: string, draft: LocalDraft): Promise<LocalDraft> {
  scanAndRedactDraftPublicFields(draft);
  await writeDraft(cwd, draft);
  return draft;
}
