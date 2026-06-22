import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { collectDraft } from '../src/draft/create.js';
import {
  useSessionCollectorGenericMetadataFixture,
  writeJsonl,
} from './session-collector-generic-metadata-helpers.js';

const fixture = useSessionCollectorGenericMetadataFixture();

describe('generic session metadata cursor collection', () => {
  it('parses explicit Cursor metadata as generic collection evidence', async () => {
    const sessionFile = join(fixture.dir(), 'cursor-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:59:59Z', session_id: 'cursor-session-old', tokens_used: 100, commands_run: 4, changed_files: [
        { path: join(fixture.dir(), 'src', 'old-cursor.ts'), lines_added: 1 }
      ] },
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'cursor-session-new', model: 'cursor-agent', tokens: { total: 64 }, commands_run: 2, tool_calls: 3, agent_turns: 5, mode: 'agent', changed_files: [
        { path: join(fixture.dir(), 'src', 'cursor.ts'), status: 'added', lines_added: 2 },
        { file_path: join(fixture.dir(), 'src', 'api.ts'), additions: 1, deletions: 1 }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'cursor', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('cursor-session-new');
    expect(metrics?.model).toBe('cursor-agent');
    expect(metrics?.tokens_used).toBe(64);
    expect(metrics?.commands_run).toBe(2);
    expect(metrics?.tool_calls).toBe(3);
    expect(metrics?.agent_turns).toBe(5);
    expect(metrics?.agent_modes).toEqual(['agent']);
    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/api.ts', 'src/cursor.ts']);
    expect(metrics?.lines_added).toBe(3);
    expect(metrics?.lines_removed).toBe(1);
    expect(metrics?.collection_quality).toBe('low');
    expect(metrics?.collection_sources).toEqual([
      { type: 'generic_metadata', name: 'cursor', quality: 'low' }
    ]);
  });

  it('ignores malformed file URI metadata paths without aborting generic collection', async () => {
    const sessionFile = join(fixture.dir(), 'generic-malformed-file-uri.jsonl');
    await writeJsonl(sessionFile, [
      {
        timestamp: '2026-05-20T01:00:00Z',
        session_id: 'generic-malformed-file-uri',
        tokens_used: 12,
        changed_files: [
          { uri: 'file:///%E0%A4%A', lines_added: 99 },
          { uri: `file://${encodeURIComponent(join(fixture.dir(), 'src', 'safe-uri.ts'))}`, lines_added: 1 }
        ]
      }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'other', sessionFile });

    expect(metrics?.session_id).toBe('generic-malformed-file-uri');
    expect(metrics?.tokens_used).toBe(12);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/safe-uri.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('auto-collects project-local Cursor metadata without counting metadata files as code changes', async () => {
    await mkdir(join(fixture.dir(), '.cursor'), { recursive: true });
    await writeFile(join(fixture.dir(), '.cursor', 'session-metrics.json'), JSON.stringify({
      timestamp: '2026-05-20T01:00:00Z',
      session_id: 'cursor-auto-session',
      model: 'cursor-agent',
      tokens_used: 42,
      changed_files: [
        { path: join(fixture.dir(), 'src', 'cursor-auto.ts'), lines_added: 1 }
      ]
    }));
    await fixture.initCommittedAgentFeedProject();

    const draft = await collectDraft({ cwd: fixture.dir() });

    expect(draft.worklog.agent).toBe('cursor');
    expect(draft.source.session_id).toBe('cursor-auto-session');
    expect(draft.worklog.metrics.tokens_used).toBe(42);
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.metrics.lines_added).toBe(1);
    expect(draft.worklog.metrics.collection_sources).toEqual([
      { type: 'generic_metadata', name: 'cursor', quality: 'low' }
    ]);
    expect(draft.worklog.changed_areas).toContain('Application code');
    expect(draft.worklog.metrics.collection_quality).toBe('low');
  });
});
