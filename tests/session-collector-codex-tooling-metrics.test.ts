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
