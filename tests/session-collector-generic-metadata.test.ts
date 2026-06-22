import { describe, expect, it } from 'vitest';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { collectDraft } from '../src/draft/create.js';
import {
  useSessionCollectorGenericMetadataFixture,
  writeJsonl,
} from './session-collector-generic-metadata-helpers.js';

const fixture = useSessionCollectorGenericMetadataFixture();

describe('generic session metadata collector', () => {
  it('falls back to generic plugin signals without user mapping', async () => {
    await fixture.initCommittedAgentFeedProject();
    await mkdir(join(fixture.dir(), '.ai'), { recursive: true });
    await writeFile(join(fixture.dir(), '.ai', 'session-metrics.json'), JSON.stringify({
      tool_calls: 9,
      commands_run: 2,
      tokens_used: 500,
      agent_turns: 4,
      agent_modes: ['parallel-agent']
    }));

    const draft = await collectDraft({ cwd: fixture.dir() });

    expect(draft.worklog.agent).toBe('other');
    expect(draft.worklog.metrics.tool_calls).toBe(9);
    expect(draft.worklog.metrics.commands_run).toBe(2);
    expect(draft.worklog.metrics.tokens_used).toBe(500);
    expect(draft.worklog.metrics.agent_turns).toBe(4);
    expect(draft.worklog.metrics.agent_modes).toEqual(['parallel-agent']);
    expect(draft.worklog.metrics.collection_quality).toBe('low');
    expect(draft.worklog.metrics.collection_sources).toEqual([
      { type: 'generic_metadata', name: 'unknown_plugin', quality: 'low' }
    ]);
  }, 60_000);

  it('excludes timestamp-less generic metadata rows when a since window is active', async () => {
    const sessionFile = join(fixture.dir(), 'generic-window-missing-timestamp.jsonl');
    await writeJsonl(sessionFile, [
      { session_id: 'generic-window-missing-timestamp', tokens_used: 999, commands_run: 8, changed_files: [
        { path: join(fixture.dir(), 'src', 'stale-generic.ts'), lines_added: 10 }
      ] },
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-window-missing-timestamp', tokens_used: 10, commands_run: 1, changed_files: [
        { path: join(fixture.dir(), 'src', 'fresh-generic.ts'), lines_added: 1 }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(10);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/fresh-generic.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('excludes timestamp-less generic metadata rows when only an until window is active', async () => {
    const sessionFile = join(fixture.dir(), 'generic-window-until-missing-timestamp.jsonl');
    await writeJsonl(sessionFile, [
      { session_id: 'generic-window-until-missing-timestamp', tokens_used: 999, commands_run: 8, changed_files: [
        { path: join(fixture.dir(), 'src', 'untimestamped-generic.ts'), lines_added: 10 }
      ] },
      { timestamp: '2026-05-20T00:30:00Z', session_id: 'generic-window-until-missing-timestamp', tokens_used: 10, commands_run: 1, changed_files: [
        { path: join(fixture.dir(), 'src', 'inside-until-generic.ts'), lines_added: 1 }
      ] },
      { timestamp: '2026-05-20T02:00:00Z', session_id: 'generic-window-until-missing-timestamp', tokens_used: 500, commands_run: 4, changed_files: [
        { path: join(fixture.dir(), 'src', 'future-generic.ts'), lines_added: 5 }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'other', sessionFile, until: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(10);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/inside-until-generic.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('filters generic plugin metadata by collection window when timestamps are present', async () => {
    const sessionFile = join(fixture.dir(), 'generic-window.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:59:59Z', session_id: 'generic-window', tokens_used: 100, commands_run: 5, tool_calls: 7, agent_turns: 9 },
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-window', tokens_used: 25, commands_run: 2, tool_calls: 3, agent_turns: 4 }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('generic-window');
    expect(metrics?.tokens_used).toBe(25);
    expect(metrics?.commands_run).toBe(2);
    expect(metrics?.tool_calls).toBe(3);
    expect(metrics?.agent_turns).toBe(4);
  });

  it('filters generic plugin metadata by common timestamp aliases and numeric epochs', async () => {
    const sessionFile = join(fixture.dir(), 'generic-window-timestamp-aliases.jsonl');
    await writeJsonl(sessionFile, [
      { created_at: '2026-05-20T00:59:59Z', session_id: 'generic-window-old', tokens_used: 100, commands_run: 5 },
      { createdAt: '2026-05-20T01:00:00Z', session_id: 'generic-window-fresh', tokens_used: 10, commands_run: 1 },
      { ts: Date.parse('2026-05-20T01:00:01Z') / 1000, tokens_used: 20, tool_calls: 2 }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('generic-window-fresh');
    expect(metrics?.tokens_used).toBe(20);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tool_calls).toBe(2);
  });

  it('captures explicit USD cost from generic metadata without estimating missing cost', async () => {
    const sessionFile = join(fixture.dir(), 'generic-cost.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-cost', tokens_used: 100, cost_usd: 0.012345 },
      { timestamp: '2026-05-20T01:01:00Z', session_id: 'generic-cost', tokens_used: 150, estimated_cost_usd: '0.023456' }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.estimated_cost_usd).toBe(0.023456);
  });

  it('only includes explicit cost in drafts when estimated cost collection is enabled', async () => {
    await fixture.initCommittedAgentFeedProject();
    const sessionFile = join(fixture.dir(), 'generic-cost-draft.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-cost-draft', estimated_cost_usd: 0.031, changed_files: [
        { path: join(fixture.dir(), 'src', 'cost.ts'), lines_added: 1 }
      ] }
    ]);

    const hidden = await collectDraft({ cwd: fixture.dir(), source: 'other', sessionFile, since: '2026-05-20T01:00:00Z', force: true });
    expect(hidden.worklog.metrics.estimated_cost_usd).toBeNull();

    const configPath = join(fixture.dir(), '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.include_estimated_cost = true;
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const visible = await collectDraft({ cwd: fixture.dir(), source: 'other', sessionFile, since: '2026-05-20T01:00:00Z', force: true });
    expect(visible.worklog.metrics.estimated_cost_usd).toBe(0.031);
  });
});
