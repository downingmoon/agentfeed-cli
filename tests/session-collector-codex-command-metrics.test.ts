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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-codex-command-'));
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

describe('Codex session collector command metrics', () => {
  it('uses parsed test output counts when Codex shell output includes a summary', async () => {
    const sessionFile = join(dir, 'codex-test-output-counts.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-test-output-counts', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'test-summary' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'test-summary', output: 'Process exited with code 1\n======= 2 failed, 10 passed, 1 skipped in 3.21s =======' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(13);
    expect(metrics?.tests_passed).toBe(10);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('does not treat non-test command failures as failed tests', async () => {
    const sessionFile = join(dir, 'codex-failed-shell.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-session-commands', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'test-ok' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'test-ok', output: 'Process exited with code 0\\nPASS tests/api.test.ts\\nTest Files: 0 failed, 1 passed, 1 total' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'git diff --check', workdir: dir }), call_id: 'lint-fail' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'lint-fail', output: 'Process exited with code 1\\nwhitespace error' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('counts Codex failed function call output status as a failed command', async () => {
    const sessionFile = join(dir, 'codex-failed-output-status.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-failed-output-status', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: "cat > src/failed-status.ts <<'EOF'\nexport const failed = true;\nEOF", workdir: dir }), call_id: 'status-fail' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'status-fail', status: 'failed', output: '' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.lines_added).toBeNull();
  });

  it('recognizes common wrapped test commands in Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-wrapped-test-commands.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-wrapped-test-commands', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'uv run --with pytest pytest tests -q', workdir: dir }), call_id: 'uv-pytest' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'uv-pytest', output: 'Process exited with code 0\n24 passed' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'python -m pytest tests/test_contracts.py -q', workdir: dir }), call_id: 'python-pytest' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'python-pytest', output: 'Process exited with code 1\nFAILED tests/test_contracts.py' } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'make test', workdir: dir }), call_id: 'make-test' } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'make-test', output: 'Process exited with code 0\nPASS' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(3);
    expect(metrics?.tests_run).toBe(26);
    expect(metrics?.tests_passed).toBe(25);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts Python unittest summaries from Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-python-unittest-summary.jsonl');
    const unittestOutput = [
      '.......Fs',
      '----------------------------------------------------------------------',
      'Ran 9 tests in 0.123s',
      '',
      'FAILED (failures=1, skipped=1)'
    ].join('\n');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-python-unittest-summary', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'python -m unittest discover', workdir: dir }), call_id: 'python-unittest' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'python-unittest', output: unittestOutput } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(9);
    expect(metrics?.tests_passed).toBe(7);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts go test JSON events and marks failed events as failed commands', async () => {
    const sessionFile = join(dir, 'codex-go-json-test-events.jsonl');
    const goJsonOutput = [
      '{"Action":"run","Package":"example.test","Test":"TestCreateDraft"}',
      '{"Action":"pass","Package":"example.test","Test":"TestCreateDraft"}',
      '{"Action":"run","Package":"example.test","Test":"TestPublishDraft"}',
      '{"Action":"fail","Package":"example.test","Test":"TestPublishDraft"}',
      '{"Action":"skip","Package":"example.test","Test":"TestLegacyImport"}',
      '{"Action":"fail","Package":"example.test"}'
    ].join('\n');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-go-json-test-events', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'go test -json ./...', workdir: dir }), call_id: 'go-json-test' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'go-json-test', output: goJsonOutput } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(3);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('recognizes direct test runner commands in Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-direct-test-commands.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-direct-test-commands', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'pytest tests -q', workdir: dir }), call_id: 'pytest-direct' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'pytest-direct', output: 'Process exited with code 0\n24 passed' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'vitest run', workdir: dir }), call_id: 'vitest-direct' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'vitest-direct', output: 'Process exited with code 0\nTest Files: 0 failed, 4 passed, 4 total\nTests: 0 failed, 4 passed, 4 total' } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'playwright test', workdir: dir }), call_id: 'playwright-direct' } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'playwright-direct', output: 'Process exited with code 1\n1 failed, 2 passed' } },
      { timestamp: '2026-05-20T00:00:07Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'node --test unit.test.js && node --test integration.test.js', workdir: dir }), call_id: 'node-test-direct' } },
      { timestamp: '2026-05-20T00:00:08Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'node-test-direct', output: 'Process exited with code 1\n# tests 4\n# suites 0\n# pass 3\n# fail 1\n# tests 3\n# suites 0\n# pass 2\n# fail 1' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(4);
    expect(metrics?.tests_run).toBe(38);
    expect(metrics?.tests_passed).toBe(35);
    expect(metrics?.failed_commands).toBe(2);
  });

  it('does not count browser test setup commands as executed tests', async () => {
    const sessionFile = join(dir, 'codex-browser-test-setup-commands.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-browser-test-setup-commands', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'playwright install --with-deps', workdir: dir }), call_id: 'playwright-install' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'playwright-install', output: 'Process exited with code 0\nBrowsers installed' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npx cypress open', workdir: dir }), call_id: 'cypress-open' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'cypress-open', output: 'Process exited with code 0\nOpening Cypress' } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'uv run playwright install chromium', workdir: dir }), call_id: 'uv-playwright-install' } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'uv-playwright-install', output: 'Process exited with code 0\nChromium installed' } },
      { timestamp: '2026-05-20T00:00:07Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'uv run cypress open', workdir: dir }), call_id: 'uv-cypress-open' } },
      { timestamp: '2026-05-20T00:00:08Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'uv-cypress-open', output: 'Process exited with code 0\nOpening Cypress' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(4);
    expect(metrics?.tests_run).toBeNull();
    expect(metrics?.tests_passed).toBeNull();
    expect(metrics?.failed_commands).toBeNull();
  });

  it('recognizes namespaced direct Codex tool calls as command and subagent metrics', async () => {
    const sessionFile = join(dir, 'codex-namespaced-direct-tools.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-namespaced-direct-tools', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'functions.exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'namespaced-test' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'namespaced-test', output: 'Process exited with code 0\nPASS tests/api.test.ts' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'multi_agent_v1.spawn_agent', arguments: JSON.stringify({ role: 'explore' }), call_id: 'namespaced-agent' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'namespaced-agent', output: 'spawned agent' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.subagents_spawned).toBe(1);
  });

  it('expands Codex parallel tool wrappers into nested command and tool metrics', async () => {
    const sessionFile = join(dir, 'codex-parallel-tool-wrapper.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-parallel-tool-wrapper', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'multi_tool_use.parallel', arguments: JSON.stringify({
        tool_uses: [
          { recipient_name: 'functions.exec_command', parameters: { cmd: 'npm test', workdir: dir } },
          { recipient_name: 'functions.exec_command', parameters: { cmd: 'npm run build', workdir: dir } },
          { recipient_name: 'functions.write_stdin', parameters: { session_id: 123, chars: '' } },
          { recipient_name: 'functions.update_plan', parameters: { plan: [] } }
        ]
      }), call_id: 'parallel-1' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'parallel-1', output: 'Process exited with code 0\nPASS tests/api.test.ts' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(4);
    expect(metrics?.commands_run).toBe(2);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBeNull();
  });

  it('counts Codex non-shell tool calls, spawned subagents, and agent turns', async () => {
    const sessionFile = join(dir, 'codex-tooling-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-session-tooling', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'commentary' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call', name: 'update_plan', arguments: JSON.stringify({ plan: [] }), call_id: 'plan-1' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'spawn_agent', arguments: JSON.stringify({ role: 'explore' }), call_id: 'agent-1' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'test-ok' } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'test-ok', output: 'Process exited with code 0\\nPASS tests/api.test.ts' } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'patch-1' } },
      { timestamp: '2026-05-20T00:00:07Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'final' } }
    ]);

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
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-failed-spawn-agent', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'spawn_agent', arguments: JSON.stringify({ role: 'explore' }), call_id: 'agent-fail' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'agent-fail', output: 'spawn failed: agent unavailable' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.subagents_spawned).toBeNull();
  });
});
