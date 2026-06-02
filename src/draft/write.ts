import { join } from 'node:path';
import { chmod, mkdir } from 'node:fs/promises';
import type { LocalDraft } from '../types.js';
import { resolveProjectRoot } from '../config/project-config.js';
import { draftMarkdown } from './markdown.js';
import { draftPaths } from './paths.js';
import { writeTextFileAtomic } from '../utils/fs.js';

const PRIVATE_DIR_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

async function ensurePrivateDraftsDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: PRIVATE_DIR_MODE });
  try { await chmod(path, PRIVATE_DIR_MODE); } catch { /* best-effort on non-POSIX filesystems */ }
}

async function writePrivateFile(path: string, contents: string): Promise<void> {
  await writeTextFileAtomic(path, contents, { mode: PRIVATE_FILE_MODE });
  try { await chmod(path, PRIVATE_FILE_MODE); } catch { /* best-effort on non-POSIX filesystems */ }
}

export async function writeDraft(cwd: string, draft: LocalDraft): Promise<{ jsonPath: string; markdownPath: string }> {
  const root = await resolveProjectRoot(cwd);
  const draftsDir = join(root, '.agentfeed', 'drafts');
  await ensurePrivateDraftsDir(draftsDir);
  const { jsonPath, markdownPath } = draftPaths(root, draft.id);
  await writePrivateFile(jsonPath, `${JSON.stringify(draft, null, 2)}\n`);
  await writePrivateFile(markdownPath, draftMarkdown(draft));
  return { jsonPath, markdownPath };
}
