import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

it('keeps CLI visibility contract aligned with backend-supported values', async () => {
  const typesSource = await readFile(join(process.cwd(), 'src', 'types.ts'), 'utf8');
  const clientSource = await readFile(join(process.cwd(), 'src', 'api', 'client.ts'), 'utf8');
  const publishResponseSource = await readFile(join(process.cwd(), 'src', 'api', 'publish-response.ts'), 'utf8');

  expect(typesSource).toContain("export type Visibility = 'private' | 'unlisted' | 'public';");
  expect(typesSource).not.toContain("'team'");
  expect(clientSource).toContain("export type { PublishDraftResult, PublishDraftStatus, PublishDraftVisibility, RemotePreviewPayload, RemotePreviewResult } from './publish-response.js';");
  expect(publishResponseSource).toContain("export type PublishDraftVisibility = 'private';");
  expect(publishResponseSource).toContain("const REMOTE_PRIVATE_REVIEW_UPLOAD_STATUS = 'needs_review' satisfies PublishDraftStatus;");
  expect(publishResponseSource).toContain("export const CACHED_PRIVATE_REVIEW_UPLOAD_STATUS = 'already_uploaded' satisfies PublishDraftStatus;");
  expect(publishResponseSource).toContain("const PUBLISH_DRAFT_RESULT_FIELDS = new Set(['id', 'status', 'visibility', 'review_url', 'created_at', 'reused_existing']);");
  expect(publishResponseSource).not.toContain("const VALID_PRIVATE_REVIEW_UPLOAD_STATUSES");
  expect(clientSource).not.toContain("Visibility, WorklogStatus");
});
