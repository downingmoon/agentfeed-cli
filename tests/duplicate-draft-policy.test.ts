import { describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectDraftWithStatus } from '../src/draft/create.js';
import { listDrafts } from '../src/draft/read.js';
import { useDuplicateDraftFixture } from './duplicate-draft-helpers.js';

const fixture = useDuplicateDraftFixture();

describe('duplicate draft uploadable policy changes', () => {
  it('does not reuse a matching draft when configured command evidence is explicitly requested', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-command-reuse.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-command-session', cwd: dir } }
    ]);
    const commandPath = join(dir, '.agentfeed', 'test-command.mjs');
    await writeFile(commandPath, 'console.log("2 passed");\n');
    await fixture.updateProjectConfig((config) => {
      config.collection.run_tests_on_collect = true;
      config.commands.test = 'node .agentfeed/test-command.mjs';
      config.commands.build = null;
    });

    const first = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z'
    });
    const second = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      runConfiguredCommands: true
    });
    const third = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      runConfiguredCommands: true
    });

    expect(first.reusedExisting).toBe(false);
    expect(first.draft.worklog.metrics.commands_run).toBeNull();
    expect(second.reusedExisting).toBe(false);
    expect(second.draft.id).not.toBe(first.draft.id);
    expect(second.draft.worklog.metrics.commands_run).toBe(1);
    expect(second.draft.worklog.metrics.tests_run).toBe(2);
    expect(third.reusedExisting).toBe(false);
    expect(third.draft.id).not.toBe(second.draft.id);
    expect(third.draft.worklog.metrics.commands_run).toBe(1);
    expect(await listDrafts(dir)).toHaveLength(3);
  });

  it('does not reuse a matching draft when file-stat collection policy changes uploadable metrics', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-file-policy-reuse.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-file-policy-session', cwd: dir } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'policy.ts')]: { type: 'add', content: 'export const policy = true;\\n' }
      } } }
    ]);

    const first = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z'
    });
    await fixture.updateProjectConfig((config) => {
      config.collection.include_file_stats = false;
    });
    const second = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z'
    });

    expect(first.reusedExisting).toBe(false);
    expect(first.draft.worklog.metrics.files_changed).toBeGreaterThan(0);
    expect(second.reusedExisting).toBe(false);
    expect(second.draft.id).not.toBe(first.draft.id);
    expect(second.draft.worklog.metrics.files_changed).toBeNull();
    expect(first.draft.source.collection_fingerprint).not.toBe(second.draft.source.collection_fingerprint);
    expect(await listDrafts(dir)).toHaveLength(2);
  });

  it('does not reuse a matching draft when project tags change uploadable public fields', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-tag-policy-reuse.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-tag-policy-session', cwd: dir } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'tags.ts')]: { type: 'add', content: 'export const tags = true;\\n' }
      } } }
    ]);

    const first = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z'
    });
    await fixture.updateProjectConfig((config) => {
      config.project.tags = ['launch-readiness'];
    });
    const second = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z'
    });

    expect(first.reusedExisting).toBe(false);
    expect(first.draft.worklog.tags).not.toContain('launch-readiness');
    expect(second.reusedExisting).toBe(false);
    expect(second.draft.id).not.toBe(first.draft.id);
    expect(second.draft.worklog.tags).toContain('launch-readiness');
    expect(first.draft.source.collection_fingerprint).not.toBe(second.draft.source.collection_fingerprint);
    expect(await listDrafts(dir)).toHaveLength(2);
  });
});
