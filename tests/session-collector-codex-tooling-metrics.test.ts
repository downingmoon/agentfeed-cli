import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { codexSessionRows, createCodexFixture, type CodexFixture, writeJsonl } from './session-collector-codex-command-helpers.js';

let fixture: CodexFixture;
let dir: string;

beforeEach(async () => {
  fixture = await createCodexFixture();
  dir = fixture.dir;
});

afterEach(async () => {
  await fixture.cleanup();
});

describe('Codex session collector tooling metrics', () => {
  it('recognizes namespaced direct Codex tool calls as command and subagent metrics', async () => {
    const sessionFile = join(dir, 'codex-namespaced-direct-tools.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-namespaced-direct-tools',
      cwd: dir,
      steps: [
        { kind: 'shell', callId: 'namespaced-test', cmd: 'npm test', output: 'Process exited with code 0\nPASS tests/api.test.ts', toolName: 'functions.exec_command' },
        { kind: 'tool', callId: 'namespaced-agent', name: 'multi_agent_v1.spawn_agent', arguments: { role: 'explore' }, output: 'spawned agent' }
      ]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.subagents_spawned).toBe(1);
  });

  it('expands Codex parallel tool wrappers into nested command and tool metrics', async () => {
    const sessionFile = join(dir, 'codex-parallel-tool-wrapper.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-parallel-tool-wrapper',
      cwd: dir,
      steps: [{
        kind: 'tool',
        callId: 'parallel-1',
        name: 'multi_tool_use.parallel',
        arguments: { tool_uses: [
          { recipient_name: 'functions.exec_command', parameters: { cmd: 'npm test', workdir: dir } },
          { recipient_name: 'functions.exec_command', parameters: { cmd: 'npm run build', workdir: dir } },
          { recipient_name: 'functions.write_stdin', parameters: { session_id: 123, chars: '' } },
          { recipient_name: 'functions.update_plan', parameters: { plan: [] } }
        ] },
        output: 'Process exited with code 0\nPASS tests/api.test.ts'
      }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(4);
    expect(metrics?.commands_run).toBe(2);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBeNull();
  });

  it('counts Codex MCP and tool-search calls once with real rollout rows', async () => {
    const sessionFile = join(dir, 'codex-mcp-tool-call-dedupe.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-mcp-tool-call-dedupe', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'tool_search_call', call_id: 'search-1', status: 'completed', execution: 'client', arguments: { query: 'codegraph', limit: 4 } } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'tool_search_output', call_id: 'search-1', status: 'completed', execution: 'client', tools: [] } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'codegraph_explore', call_id: 'mcp-1', arguments: JSON.stringify({ query: 'parseCodexSessionFile' }) } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'event_msg', payload: { type: 'mcp_tool_call_end', call_id: 'mcp-1', plugin_id: 'omo@sisyphuslabs', invocation: { server: 'codegraph', tool: 'codegraph_explore', arguments: { query: 'parseCodexSessionFile' } }, duration: { secs: 0, nanos: 1 }, result: {} } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'response_item', payload: { type: 'function_call', name: 'diagnostics', call_id: 'mcp-2', arguments: JSON.stringify({ filePath: 'src/index.ts' }) } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'event_msg', payload: { type: 'mcp_tool_call_end', call_id: 'mcp-2', plugin_id: 'omo@sisyphuslabs', invocation: { server: 'lsp', tool: 'diagnostics', arguments: { filePath: 'src/index.ts' } }, duration: { secs: 0, nanos: 1 }, result: {} } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(3);
  });

  it('counts Codex non-shell tool calls, spawned subagents, and agent turns', async () => {
    const sessionFile = join(dir, 'codex-tooling-session.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-session-tooling',
      cwd: dir,
      steps: [
        { kind: 'agent_message', phase: 'commentary' },
        { kind: 'tool', callId: 'plan-1', name: 'update_plan', arguments: { plan: [] }, output: '' },
        { kind: 'tool', callId: 'agent-1', name: 'spawn_agent', arguments: { role: 'explore' }, output: 'spawned agent' },
        { kind: 'shell', callId: 'test-ok', cmd: 'npm test', output: 'Process exited with code 0\nPASS tests/api.test.ts' },
        { kind: 'custom_tool', callId: 'patch-1', name: 'apply_patch', status: 'completed' },
        { kind: 'agent_message', phase: 'final' }
      ]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(4);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.subagents_spawned).toBe(1);
    expect(metrics?.agent_turns).toBe(2);
  });

  it('uses Codex task turn ids instead of streaming agent message chunks for turns', async () => {
    const sessionFile = join(dir, 'codex-task-turn-events.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-task-turn-events', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'task_started', turn_id: 'turn-1', started_at: 1, collaboration_mode_kind: 'default' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'commentary' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'commentary' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'event_msg', payload: { type: 'task_complete', turn_id: 'turn-1', completed_at: 4 } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'event_msg', payload: { type: 'task_started', turn_id: 'turn-2', started_at: 5, collaboration_mode_kind: 'default' } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'final' } },
      { timestamp: '2026-05-20T00:00:07Z', type: 'event_msg', payload: { type: 'task_complete', turn_id: 'turn-2', completed_at: 7 } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.agent_turns).toBe(2);
  });

  it('does not count failed Codex spawn_agent calls as spawned subagents', async () => {
    const sessionFile = join(dir, 'codex-failed-spawn-agent.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-failed-spawn-agent',
      cwd: dir,
      steps: [{ kind: 'tool', callId: 'agent-fail', name: 'spawn_agent', arguments: { role: 'explore' }, output: 'spawn failed: agent unavailable' }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.subagents_spawned).toBeNull();
  });
});
