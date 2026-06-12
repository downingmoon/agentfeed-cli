import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { buildDraftListRow } from '../src/cli/draft-list-rows.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-draft-list-rows-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('draft list row builder', () => {
  it('redacts and compacts draft titles before exposing list rows', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Fix API token leak for alice@example.com with whitespace\n\nthat should collapse in lists';
    draft.worklog.metrics.files_changed = 2;
    draft.worklog.metrics.lines_added = 42;
    draft.worklog.metrics.lines_removed = 7;
    const paths = await writeDraft(dir, draft);

    const row = await buildDraftListRow(dir, {
      id: draft.id,
      path: paths.jsonPath,
      mtimeMs: Date.parse('2026-06-12T03:00:00.000Z')
    });

    expect(row).toMatchObject({
      id: draft.id,
      path: paths.jsonPath,
      updated_at: '2026-06-12T03:00:00.000Z',
      valid: true,
      project: 'proj',
      agent: 'codex',
      status: 'pending',
      privacy: 'safe',
      findings: 0,
      metrics: '2 files · +42 -7',
      review_url: null
    });
    if (row.valid) {
      expect(row.title).not.toContain('alice@example.com');
      expect(row.title).toContain('[REDACTED_EMAIL]');
      expect(row.title).not.toContain('\n');
    }
  });

  it('returns invalid rows with compact error text when a saved draft cannot be read', async () => {
    const draftsDir = join(dir, '.agentfeed', 'drafts');
    await mkdir(draftsDir, { recursive: true });
    const path = join(draftsDir, 'draft_broken.json');
    await writeFile(path, '{not-json', 'utf8');

    const row = await buildDraftListRow(dir, {
      id: 'draft_broken',
      path,
      mtimeMs: Date.parse('2026-06-12T04:00:00.000Z')
    });

    expect(row).toMatchObject({
      id: 'draft_broken',
      path,
      updated_at: '2026-06-12T04:00:00.000Z',
      valid: false
    });
    if (!row.valid) {
      expect(row.error).toContain('JSON');
      expect(row.error).not.toContain('\n');
    }
  });
});
