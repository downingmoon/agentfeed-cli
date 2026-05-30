import { join } from 'node:path';

const SAFE_DRAFT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function isSafeDraftId(id: string): boolean {
  return SAFE_DRAFT_ID.test(id);
}

export function assertSafeDraftId(id: string): string {
  if (!isSafeDraftId(id)) {
    throw new Error('Invalid draft id: use only letters, numbers, underscores, and hyphens.');
  }
  return id;
}

export function draftPaths(root: string, id: string): { jsonPath: string; markdownPath: string } {
  const safeId = assertSafeDraftId(id);
  const draftsDir = join(root, '.agentfeed', 'drafts');
  return {
    jsonPath: join(draftsDir, `${safeId}.json`),
    markdownPath: join(draftsDir, `${safeId}.md`)
  };
}
