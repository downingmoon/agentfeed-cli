import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { readDraft } from '../src/draft/read.js';
import { writeDraft } from '../src/draft/write.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-draft-validation-'));
  await initProject({ cwd: dir, noGitCheck: true });
  await mkdir(join(dir, '.agentfeed', 'drafts'), { recursive: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('local draft validation', () => {
  it('returns a reconstructed LocalDraft without unknown persisted fields', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    await writeDraft(dir, draft);
    const draftPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json`);
    const mutated = {
      ...draft,
      unexpected_root: 'remove me',
      project: { ...draft.project, unexpected_project: 'remove me' },
      worklog: { ...draft.worklog, unexpected_worklog: 'remove me' },
      source: { ...draft.source, unexpected_source: 'remove me' },
      upload: { ...draft.upload, unexpected_upload: 'remove me' }
    };

    await writeFile(draftPath, `${JSON.stringify(mutated, null, 2)}\n`);

    const loaded = await readDraft(dir, draft.id);

    expect(Object.hasOwn(loaded, 'unexpected_root')).toBe(false);
    expect(Object.hasOwn(loaded.project, 'unexpected_project')).toBe(false);
    expect(Object.hasOwn(loaded.worklog, 'unexpected_worklog')).toBe(false);
    expect(Object.hasOwn(loaded.source, 'unexpected_source')).toBe(false);
    expect(Object.hasOwn(loaded.upload, 'unexpected_upload')).toBe(false);
  });
});
