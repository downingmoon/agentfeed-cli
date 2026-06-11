import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LocalDraft } from '../src/types.js';
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

async function expectDraftReadFailure(mutator: (draft: LocalDraft) => void, expectedMessage: string): Promise<void> {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
  await writeDraft(dir, draft);
  const draftPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json`);

  mutator(draft);
  await writeFile(draftPath, `${JSON.stringify(draft, null, 2)}\n`);

  await expect(readDraft(dir, draft.id)).rejects.toThrow(expectedMessage);
}

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

  it('rejects backend-ingest string fields that are too long before upload', async () => {
    await expectDraftReadFailure((draft) => {
      draft.project.name = 'p'.repeat(101);
    }, 'project.name must be at most 100 characters');

    await expectDraftReadFailure((draft) => {
      draft.source.tool_version = 'v'.repeat(101);
    }, 'source.tool_version must be at most 100 characters');

    await expectDraftReadFailure((draft) => {
      draft.worklog.title = 't'.repeat(201);
    }, 'worklog.title must be at most 200 characters');
  });

  it('rejects backend-ingest arrays that are too large before upload', async () => {
    await expectDraftReadFailure((draft) => {
      draft.worklog.tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`);
    }, 'worklog.tags must contain at most 20 items');

    await expectDraftReadFailure((draft) => {
      draft.worklog.timeline = Array.from({ length: 101 }, (_, index) => ({ order: index, title: `Step ${index}` }));
    }, 'worklog.timeline must contain at most 100 items');

    await expectDraftReadFailure((draft) => {
      draft.privacy_scan.findings = Array.from({ length: 51 }, (_, index) => ({
        id: `finding-${index}`,
        type: 'possible_secret',
        severity: 'high',
        message: `Finding ${index}`,
        resolved: false
      }));
    }, 'privacy_scan.findings must contain at most 50 items');
  });

  it('rejects backend-ingest required strings that are empty before upload', async () => {
    await expectDraftReadFailure((draft) => {
      draft.project.name = '';
    }, 'project.name must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.worklog.summary = '';
    }, 'worklog.summary must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.worklog.timeline = [{ order: 0, title: '' }];
    }, 'worklog.timeline[0].title must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.privacy_scan.findings = [{
        id: '',
        type: 'possible_secret',
        severity: 'high',
        message: 'Missing id',
        resolved: false
      }];
    }, 'privacy_scan.findings[0].id must not be empty');
  });

  it('rejects backend-ingest string array items that are empty before upload', async () => {
    await expectDraftReadFailure((draft) => {
      draft.worklog.tags = [''];
    }, 'worklog.tags[0] must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.worklog.changed_areas = [''];
    }, 'worklog.changed_areas[0] must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.worklog.metrics.models_used = ['gpt-5.5', ''];
    }, 'worklog.metrics.models_used[1] must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.worklog.metrics.agent_modes = ['ultrawork', ''];
    }, 'worklog.metrics.agent_modes[1] must not be empty');

    await expectDraftReadFailure((draft) => {
      draft.worklog.metrics.collection_sources = [{ type: 'agent_session', name: '', quality: 'high' }];
    }, 'worklog.metrics.collection_sources[0].name must not be empty');
  });

  it('rejects backend-ingest evidence fields that the API contract does not support', async () => {
    await expectDraftReadFailure((draft) => {
      Object.assign(draft.worklog.metrics, { raw_tokens: 'must not be ignored' });
    }, 'worklog.metrics.raw_tokens is not supported by the AgentFeed API contract');

    await expectDraftReadFailure((draft) => {
      draft.worklog.metrics.agent_metrics = [{ agent: 'codex', tokens_used: 1 }];
      Object.assign(draft.worklog.metrics.agent_metrics[0], { raw_session: 'must not be ignored' });
    }, 'worklog.metrics.agent_metrics[0].raw_session is not supported by the AgentFeed API contract');

    await expectDraftReadFailure((draft) => {
      draft.worklog.metrics.agent_metrics = [{ agent: 'codex', tokens_used: 1 }];
      Object.assign(draft.worklog.metrics.agent_metrics[0], { commits_created: 1 });
    }, 'worklog.metrics.agent_metrics[0].commits_created is not supported by the AgentFeed API contract');

    await expectDraftReadFailure((draft) => {
      draft.worklog.metrics.collection_sources = [{ type: 'agent_session', name: 'codex', quality: 'high' }];
      Object.assign(draft.worklog.metrics.collection_sources[0], { raw_path: 'must not be ignored' });
    }, 'worklog.metrics.collection_sources[0].raw_path is not supported by the AgentFeed API contract');
  });
});
