import { loadProjectConfig } from '../config/project-config.js';
import { listDrafts, readDraft } from '../draft/read.js';
import type { LocalDraft } from '../types.js';
import { noOpenableDraftsMessage, noUploadedDraftsMessage, notUploadedDraftMessage } from './open-command.js';

export type OpenDraftResolverOptions = {
  readonly cwd: string;
  readonly id?: string | null;
  readonly latest?: boolean;
};

export async function resolveOpenDraft(options: OpenDraftResolverOptions): Promise<LocalDraft> {
  await loadProjectConfig(options.cwd);
  if (options.id && !options.latest) {
    const draft = await readDraft(options.cwd, options.id);
    if (!draft.upload.review_url) throw new Error(notUploadedDraftMessage(draft.id));
    return draft;
  }

  const rows = await listDrafts(options.cwd);
  if (!rows.length) throw new Error(noOpenableDraftsMessage());

  let latestValidDraft: LocalDraft | null = null;
  for (const row of rows) {
    let draft: LocalDraft;
    try {
      draft = await readDraft(options.cwd, row.id);
    } catch {
      continue;
    }
    latestValidDraft ??= draft;
    if (draft.upload.review_url) return draft;
  }

  if (latestValidDraft) throw new Error(noUploadedDraftsMessage(latestValidDraft.id));
  throw new Error([
    'No openable local drafts found.',
    'Run: agentfeed drafts',
    'Run: agentfeed collect --explain'
  ].join('\n'));
}
