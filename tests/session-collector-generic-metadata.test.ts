import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';

let dir: string;
async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-generic-metadata-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('generic session metadata collector', () => {
  it('falls back to generic plugin signals without user mapping', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    await mkdir(join(dir, '.ai'), { recursive: true });
    await writeFile(join(dir, '.ai', 'session-metrics.json'), JSON.stringify({
      tool_calls: 9,
      commands_run: 2,
      tokens_used: 500,
      agent_turns: 4,
      agent_modes: ['parallel-agent']
    }));

    const draft = await collectDraft({ cwd: dir });

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
    const sessionFile = join(dir, 'generic-window-missing-timestamp.jsonl');
    await writeJsonl(sessionFile, [
      { session_id: 'generic-window-missing-timestamp', tokens_used: 999, commands_run: 8, changed_files: [
        { path: join(dir, 'src', 'stale-generic.ts'), lines_added: 10 }
      ] },
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-window-missing-timestamp', tokens_used: 10, commands_run: 1, changed_files: [
        { path: join(dir, 'src', 'fresh-generic.ts'), lines_added: 1 }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(10);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/fresh-generic.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('excludes timestamp-less generic metadata rows when only an until window is active', async () => {
    const sessionFile = join(dir, 'generic-window-until-missing-timestamp.jsonl');
    await writeJsonl(sessionFile, [
      { session_id: 'generic-window-until-missing-timestamp', tokens_used: 999, commands_run: 8, changed_files: [
        { path: join(dir, 'src', 'untimestamped-generic.ts'), lines_added: 10 }
      ] },
      { timestamp: '2026-05-20T00:30:00Z', session_id: 'generic-window-until-missing-timestamp', tokens_used: 10, commands_run: 1, changed_files: [
        { path: join(dir, 'src', 'inside-until-generic.ts'), lines_added: 1 }
      ] },
      { timestamp: '2026-05-20T02:00:00Z', session_id: 'generic-window-until-missing-timestamp', tokens_used: 500, commands_run: 4, changed_files: [
        { path: join(dir, 'src', 'future-generic.ts'), lines_added: 5 }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'other', sessionFile, until: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(10);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/inside-until-generic.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('filters generic plugin metadata by collection window when timestamps are present', async () => {
    const sessionFile = join(dir, 'generic-window.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:59:59Z', session_id: 'generic-window', tokens_used: 100, commands_run: 5, tool_calls: 7, agent_turns: 9 },
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-window', tokens_used: 25, commands_run: 2, tool_calls: 3, agent_turns: 4 }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('generic-window');
    expect(metrics?.tokens_used).toBe(25);
    expect(metrics?.commands_run).toBe(2);
    expect(metrics?.tool_calls).toBe(3);
    expect(metrics?.agent_turns).toBe(4);
  });

  it('filters generic plugin metadata by common timestamp aliases and numeric epochs', async () => {
    const sessionFile = join(dir, 'generic-window-timestamp-aliases.jsonl');
    await writeJsonl(sessionFile, [
      { created_at: '2026-05-20T00:59:59Z', session_id: 'generic-window-old', tokens_used: 100, commands_run: 5 },
      { createdAt: '2026-05-20T01:00:00Z', session_id: 'generic-window-fresh', tokens_used: 10, commands_run: 1 },
      { ts: Date.parse('2026-05-20T01:00:01Z') / 1000, tokens_used: 20, tool_calls: 2 }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('generic-window-fresh');
    expect(metrics?.tokens_used).toBe(20);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tool_calls).toBe(2);
  });

  it('captures explicit USD cost from generic metadata without estimating missing cost', async () => {
    const sessionFile = join(dir, 'generic-cost.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-cost', tokens_used: 100, cost_usd: 0.012345 },
      { timestamp: '2026-05-20T01:01:00Z', session_id: 'generic-cost', tokens_used: 150, estimated_cost_usd: '0.023456' }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'other', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.estimated_cost_usd).toBe(0.023456);
  });

  it('only includes explicit cost in drafts when estimated cost collection is enabled', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'generic-cost-draft.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'generic-cost-draft', estimated_cost_usd: 0.031, changed_files: [
        { path: join(dir, 'src', 'cost.ts'), lines_added: 1 }
      ] }
    ]);

    const hidden = await collectDraft({ cwd: dir, source: 'other', sessionFile, since: '2026-05-20T01:00:00Z', force: true });
    expect(hidden.worklog.metrics.estimated_cost_usd).toBeNull();

    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.include_estimated_cost = true;
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const visible = await collectDraft({ cwd: dir, source: 'other', sessionFile, since: '2026-05-20T01:00:00Z', force: true });
    expect(visible.worklog.metrics.estimated_cost_usd).toBe(0.031);
  });

  it('parses explicit Cursor metadata as generic collection evidence', async () => {
    const sessionFile = join(dir, 'cursor-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:59:59Z', session_id: 'cursor-session-old', tokens_used: 100, commands_run: 4, changed_files: [
        { path: join(dir, 'src', 'old-cursor.ts'), lines_added: 1 }
      ] },
      { timestamp: '2026-05-20T01:00:00Z', session_id: 'cursor-session-new', model: 'cursor-agent', tokens: { total: 64 }, commands_run: 2, tool_calls: 3, agent_turns: 5, mode: 'agent', changed_files: [
        { path: join(dir, 'src', 'cursor.ts'), status: 'added', lines_added: 2 },
        { file_path: join(dir, 'src', 'api.ts'), additions: 1, deletions: 1 }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'cursor', sessionFile, since: '2026-05-20T01:00:00Z' });

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
    const sessionFile = join(dir, 'generic-malformed-file-uri.jsonl');
    await writeJsonl(sessionFile, [
      {
        timestamp: '2026-05-20T01:00:00Z',
        session_id: 'generic-malformed-file-uri',
        tokens_used: 12,
        changed_files: [
          { uri: 'file:///%E0%A4%A', lines_added: 99 },
          { uri: `file://${encodeURIComponent(join(dir, 'src', 'safe-uri.ts'))}`, lines_added: 1 }
        ]
      }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'other', sessionFile });

    expect(metrics?.session_id).toBe('generic-malformed-file-uri');
    expect(metrics?.tokens_used).toBe(12);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/safe-uri.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('auto-collects project-local Cursor metadata without counting metadata files as code changes', async () => {
    await mkdir(join(dir, '.cursor'), { recursive: true });
    await writeFile(join(dir, '.cursor', 'session-metrics.json'), JSON.stringify({
      timestamp: '2026-05-20T01:00:00Z',
      session_id: 'cursor-auto-session',
      model: 'cursor-agent',
      tokens_used: 42,
      changed_files: [
        { path: join(dir, 'src', 'cursor-auto.ts'), lines_added: 1 }
      ]
    }));
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });

    const draft = await collectDraft({ cwd: dir });

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
