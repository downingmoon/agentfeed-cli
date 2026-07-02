import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { resolveOpenDraft } from '../src/cli/open-draft-resolver.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-open-draft-resolver-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function waitForMtimeTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

function markUploaded(draft: ReturnType<typeof createEmptyDraft>, worklogId: string): void {
  draft.upload = {
    uploaded: true,
    worklog_id: worklogId,
    review_url: `https://agentfeed.downingmoon.dev/worklogs/${worklogId}/review`,
    uploaded_at: '2026-06-12T00:00:00.000Z'
  };
}

describe('open draft resolver', () => {
  it('returns an uploaded draft selected by id', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_open_selected';
    markUploaded(draft, 'worklog_open_selected');
    await writeDraft(dir, draft);

    const resolved = await resolveOpenDraft({ cwd: dir, id: draft.id, latest: false });

    expect(resolved.id).toBe(draft.id);
    expect(resolved.upload.review_url).toBe('https://agentfeed.downingmoon.dev/worklogs/worklog_open_selected/review');
  });

  it('rejects a pending draft selected by id with publish guidance', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_pending_open_resolver';
    await writeDraft(dir, draft);

    await expect(resolveOpenDraft({ cwd: dir, id: draft.id, latest: false })).rejects.toThrow([
      `Draft has not been uploaded yet: ${draft.id}`,
      `Run: agentfeed publish --id ${draft.id} --yes`,
      `Run: agentfeed preview --id ${draft.id}`,
      'Run: agentfeed drafts'
    ].join('\n'));
  });

  it('skips malformed latest files and returns the newest uploaded draft', async () => {
    const uploaded = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    uploaded.id = 'draft_uploaded_open_resolver';
    markUploaded(uploaded, 'worklog_uploaded_open_resolver');
    await writeDraft(dir, uploaded);
    await waitForMtimeTick();
    await mkdir(join(dir, '.agentfeed', 'drafts'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'drafts', 'draft_malformed_open_resolver.json'), '{not-json', 'utf8');

    const resolved = await resolveOpenDraft({ cwd: dir, latest: true });

    expect(resolved.id).toBe(uploaded.id);
  });

  it('guides publishing the newest valid draft when no uploaded draft exists', async () => {
    const oldDraft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    oldDraft.id = 'draft_pending_old_resolver';
    await writeDraft(dir, oldDraft);
    await waitForMtimeTick();
    const newDraft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    newDraft.id = 'draft_pending_new_resolver';
    await writeDraft(dir, newDraft);

    await expect(resolveOpenDraft({ cwd: dir, latest: true })).rejects.toThrow([
      'No uploaded local drafts found.',
      'Newest draft: draft_pending_new_resolver',
      'Run: agentfeed publish --id draft_pending_new_resolver --yes',
      'Run: agentfeed share --yes',
      'Run: agentfeed drafts'
    ].join('\n'));
  });

  it('renders empty uploaded-review guidance when no draft exists', async () => {
    await expect(resolveOpenDraft({ cwd: dir, latest: true })).rejects.toThrow('No uploaded review drafts found.');
  });
});
