import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readCollectionState } from '../src/config/collection-state.js';
import {
  parseCollectDraftOutput,
  useCollectConfigStateFixture,
} from './cli-collect-config-state-helpers.js';

const fixture = useCollectConfigStateFixture();

describe('collect config and state handling', () => {
  it('warns about a malformed collection cursor instead of silently ignoring it', async () => {
    await writeFile(join(fixture.dir(), '.agentfeed', 'state.json'), '{not-json');
    await fixture.writeSource('export const ok = "cursor-recovered";\n');

    const stdout = fixture.runCollect([
      '--json',
      '--until',
      '2026-05-20T02:00:00Z',
      '--no-save-cursor'
    ]);

    const draft = parseCollectDraftOutput(stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.source?.collection_window?.since).toBeNull();
    expect(draft.source?.collection_window?.until).toBe('2026-05-20T02:00:00.000Z');
    expect(draft.warnings).toEqual(expect.arrayContaining([expect.stringContaining('AgentFeed collection cursor is unreadable')]));
  });

  it('warns when malformed saved drafts are skipped during duplicate detection', async () => {
    await mkdir(join(fixture.dir(), '.agentfeed', 'drafts'), { recursive: true });
    await writeFile(join(fixture.dir(), '.agentfeed', 'drafts', 'draft_malformed.json'), '{not-json');
    await fixture.writeSource('export const ok = "malformed-draft-warning";\n');

    const stdout = fixture.runCollect([
      '--json',
      '--until',
      '2026-05-20T02:00:00Z',
      '--no-save-cursor'
    ]);

    const draft = parseCollectDraftOutput(stdout);
    const warnings = draft.warnings?.join('\n') ?? '';
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Existing AgentFeed draft could not be read and was skipped during duplicate detection: draft_malformed')
    ]));
    expect(warnings).toContain('agentfeed drafts');
    expect(warnings).toContain('agentfeed collect --explain');
  });

  it('persists collection cursor when rendering JSON output', async () => {
    await fixture.writeSource('export const ok = false;\n');

    const stdout = fixture.runCollect([
      '--json',
      '--since',
      '2026-05-20T01:00:00Z',
      '--until',
      '2026-05-20T02:00:00Z'
    ]);

    const draft = parseCollectDraftOutput(stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.worklog).toBeTruthy();
    expect(draft.source).toBeTruthy();
    expect(draft.draft).toBeUndefined();
    expect(draft.draft_id).toBeUndefined();
    expect(draft.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
    expect(draft.source?.collection_window?.until).toBe('2026-05-20T02:00:00.000Z');
    await expect(readCollectionState(fixture.dir())).resolves.toEqual({ last_collected_at: '2026-05-20T02:00:00.000Z' });
  });
});
