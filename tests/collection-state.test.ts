import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { readCollectionState, resolveCollectionWindow, resolveCollectionWindowWithDiagnostics, writeCollectionState } from '../src/config/collection-state.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-state-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('collection state', () => {
  it('uses last_collected_at as the default since boundary and records now as until', async () => {
    await writeCollectionState(dir, { last_collected_at: '2026-05-20T01:00:00.000Z' });

    const window = await resolveCollectionWindow({ cwd: dir, args: [], now: new Date('2026-05-20T02:00:00.000Z') });

    expect(window).toEqual({ since: '2026-05-20T01:00:00.000Z', until: '2026-05-20T02:00:00.000Z' });
  });

  it('lets explicit --since and --until override state and lets --all disable the cursor', async () => {
    await writeCollectionState(dir, { last_collected_at: '2026-05-20T01:00:00.000Z' });

    await expect(resolveCollectionWindow({ cwd: dir, args: ['--since', '2026-05-20T03:00:00Z', '--until=2026-05-20T04:00:00Z'], now: new Date('2026-05-20T05:00:00Z') })).resolves.toEqual({
      since: '2026-05-20T03:00:00.000Z',
      until: '2026-05-20T04:00:00.000Z'
    });
    await expect(resolveCollectionWindow({ cwd: dir, args: ['--all'], now: new Date('2026-05-20T05:00:00Z') })).resolves.toEqual({
      since: null,
      until: '2026-05-20T05:00:00.000Z'
    });
  });

  it('keeps the saved cursor when --force only bypasses draft reuse', async () => {
    await writeCollectionState(dir, { last_collected_at: '2026-05-20T01:00:00.000Z' });

    const window = await resolveCollectionWindow({ cwd: dir, args: ['--force'], now: new Date('2026-05-20T05:00:00Z') });

    expect(window).toEqual({
      since: '2026-05-20T01:00:00.000Z',
      until: '2026-05-20T05:00:00.000Z'
    });
  });

  it('persists the latest successful collection timestamp', async () => {
    await writeCollectionState(dir, { last_collected_at: '2026-05-20T02:00:00.000Z' });

    await expect(readCollectionState(dir)).resolves.toEqual({ last_collected_at: '2026-05-20T02:00:00.000Z' });
  });

  it('surfaces malformed state files while ignoring the unsafe cursor', async () => {
    await mkdir(join(dir, '.agentfeed'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'state.json'), '{not valid json', 'utf8');

    const result = await resolveCollectionWindowWithDiagnostics({
      cwd: dir,
      args: [],
      now: new Date('2026-05-20T05:00:00.000Z')
    });

    expect(result.window).toEqual({ since: null, until: '2026-05-20T05:00:00.000Z' });
    expect(result.warnings).toHaveLength(1);
    expect(result.collection_state.valid).toBe(false);
    expect(result.warnings[0]).toContain('Collection cursor could not be read');
    expect(result.warnings[0]).toContain('.agentfeed/state.json');
  });
});
