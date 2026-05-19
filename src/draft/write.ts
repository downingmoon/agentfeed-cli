import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { LocalDraft } from '../types.js';
import { resolveProjectRoot } from '../config/project-config.js';
import { ensureDir, writeJson } from '../utils/fs.js';
import { draftMarkdown } from './markdown.js';

export async function writeDraft(cwd: string, draft: LocalDraft): Promise<{ jsonPath: string; markdownPath: string }> {
  const root = await resolveProjectRoot(cwd);
  const draftsDir = join(root, '.agentfeed', 'drafts');
  await ensureDir(draftsDir);
  const jsonPath = join(draftsDir, `${draft.id}.json`);
  const markdownPath = join(draftsDir, `${draft.id}.md`);
  await writeJson(jsonPath, draft);
  await writeFile(markdownPath, draftMarkdown(draft), 'utf8');
  return { jsonPath, markdownPath };
}
