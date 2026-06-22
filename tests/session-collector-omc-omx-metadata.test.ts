import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';

let dir: string;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-omc-omx-metadata-'));
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

describe('agent session OMC and OMX metadata', () => {
  it('merges OMC Claude session summaries and tool statistics without raw transcript data', async () => {
    await mkdir(join(dir, '.omc', 'sessions'), { recursive: true });
    await mkdir(join(dir, '.omc', 'state'), { recursive: true });
    await writeFile(join(dir, '.omc', 'sessions', 'claude-omc-session.json'), JSON.stringify({
      session_id: 'claude-omc-session',
      ended_at: '2026-05-20T00:03:00Z',
      reason: 'complete',
      estimated_cost_usd: 0.044,
      agents_spawned: 2,
      agents_completed: 1,
      modes_used: ['ralph', 'team']
    }));
    await writeJsonl(join(dir, '.omc', 'state', 'agent-replay-claude-omc-session.jsonl'), [
      { t: 0, agent: 'a1', agent_type: 'executor', event: 'agent_stop', success: true }
    ]);
    const sessionFile = join(dir, 'claude-omc-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-omc-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', name: 'Skill', input: { skill: 'test-driven-development' } },
        { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.skills_used).toBe(1);
    expect(metrics?.subagents_spawned).toBe(2);
    expect(metrics?.subagents_completed).toBe(1);
    expect(metrics?.estimated_cost_usd).toBe(0.044);
    expect(metrics?.agent_modes).toEqual(['ralph', 'team']);
  });

  it('does not merge OMX subagent tracking from a different Codex session id', async () => {
    await mkdir(join(dir, '.omx', 'state'), { recursive: true });
    await writeFile(join(dir, '.omx', 'state', 'subagent-tracking.json'), JSON.stringify({
      schemaVersion: 1,
      sessions: {
        'other-codex-session': {
          session_id: 'other-codex-session',
          leader_thread_id: 'other-codex-session',
          threads: {
            'other-codex-session': { thread_id: 'other-codex-session', kind: 'leader', turn_count: 10, mode: 'team' },
            'other-sub-1': { thread_id: 'other-sub-1', kind: 'subagent', turn_count: 5 }
          }
        }
      }
    }));
    const sessionFile = join(dir, 'codex-current-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-current-session', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'final' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.agent_turns).toBe(1);
    expect(metrics?.subagents_spawned).toBeNull();
    expect(metrics?.agent_modes).toBeNull();
    expect(metrics?.collection_sources).toEqual([
      { type: 'agent_session', name: 'codex', quality: 'high' }
    ]);
  });

  it('merges OMX Codex subagent tracking and turn metrics', async () => {
    await mkdir(join(dir, '.omx', 'state'), { recursive: true });
    await writeFile(join(dir, '.omx', 'metrics.json'), JSON.stringify({ session_turns: 4, session_total_tokens: 1234, cost_usd: 0.055 }));
    await writeFile(join(dir, '.omx', 'state', 'subagent-tracking.json'), JSON.stringify({
      schemaVersion: 1,
      sessions: {
        'codex-omx-session': {
          session_id: 'codex-omx-session',
          leader_thread_id: 'codex-omx-session',
          threads: {
            'codex-omx-session': { thread_id: 'codex-omx-session', kind: 'leader', turn_count: 3, mode: 'explore' },
            'sub-1': { thread_id: 'sub-1', kind: 'subagent', turn_count: 1 },
            'sub-2': { thread_id: 'sub-2', kind: 'subagent', turn_count: 2 }
          }
        }
      }
    }));
    const sessionFile = join(dir, 'codex-omx-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-omx-session', cwd: dir } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.agent_turns).toBe(6);
    expect(metrics?.subagents_spawned).toBe(2);
    expect(metrics?.subagents_completed).toBe(2);
    expect(metrics?.tokens_used).toBe(1234);
    expect(metrics?.estimated_cost_usd).toBe(0.055);
    expect(metrics?.agent_modes).toEqual(['explore']);
    expect(metrics?.collection_quality).toBe('high');
    expect(metrics?.collection_sources).toEqual([
      { type: 'agent_session', name: 'codex', quality: 'high' },
      { type: 'plugin_metadata', name: 'omx', quality: 'medium' }
    ]);
  });
});
