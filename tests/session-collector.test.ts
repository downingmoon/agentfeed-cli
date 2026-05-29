import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics, sessionFileBelongsToProject } from '../src/collectors/agent-session.js';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';

let dir: string;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-'));
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

describe('agent session collector', () => {
  it('extracts Claude Code tokens, file edits, and test commands from a session file', async () => {
    const sessionFile = join(dir, 'claude-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'user', cwd: dir, sessionId: 'claude-session-1', timestamp: '2026-05-20T00:00:00Z', message: { role: 'user', content: 'add API tests' } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-session-1', timestamp: '2026-05-20T00:00:10Z', message: { model: 'claude-sonnet-4-5', usage: { input_tokens: 100, cache_creation_input_tokens: 50, cache_read_input_tokens: 25, output_tokens: 30 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'api.test.ts'), content: 'test(\'ok\', () => expect(true).toBe(true));\n' } },
        { type: 'tool_use', name: 'Edit', input: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\n' } },
        { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }
      ] } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-session-1', timestamp: '2026-05-20T00:00:20Z', message: { model: 'claude-sonnet-4-5', usage: { input_tokens: 10, output_tokens: 5 }, content: [] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.session_id).toBe('claude-session-1');
    expect(metrics?.model).toBe('claude-sonnet-4-5');
    expect(metrics?.tokens_used).toBe(220);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/api.test.ts', 'src/api.ts']);
    expect(metrics?.lines_added).toBeGreaterThanOrEqual(2);
  });

  it('extracts Claude Code failed Bash test results from tool_result rows', async () => {
    const sessionFile = join(dir, 'claude-failed-test-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-failed-test-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'bash-test-1', name: 'Bash', input: { command: 'npm test' } },
        { type: 'tool_use', id: 'bash-build-1', name: 'Bash', input: { command: 'npm run build' } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-failed-test-session', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'bash-test-1', content: 'Process exited with code 1\nFAIL tests/api.test.ts', is_error: true },
        { type: 'tool_result', tool_use_id: 'bash-build-1', content: 'Process exited with code 0\nBuild complete' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.commands_run).toBe(2);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(0);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('does not count successful Claude test summaries with zero failed as failures', async () => {
    const sessionFile = join(dir, 'claude-zero-failed-test-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-zero-failed-test-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'bash-test-1', name: 'Bash', input: { command: 'npm test' } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-zero-failed-test-session', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'bash-test-1', content: 'Process exited with code 0\nTest Suites: 0 failed, 4 passed, 4 total\nTests: 0 failed, 19 passed, 19 total' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBeNull();
  });

  it('counts Claude assistant turns and Task subagent launches', async () => {
    const sessionFile = join(dir, 'claude-agent-turns-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-agent-turns-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'task-1', name: 'Task', input: { description: 'Explore repo', prompt: 'Map relevant files' } }
      ] } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-agent-turns-session', timestamp: '2026-05-20T00:00:10Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: join(dir, 'src', 'api.ts') } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.subagents_spawned).toBe(1);
    expect(metrics?.agent_turns).toBe(2);
  });

  it('does not count Claude TaskCreate todo planning as a subagent launch', async () => {
    const sessionFile = join(dir, 'claude-taskcreate-todo-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-taskcreate-todo-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'todo-1', name: 'TaskCreate', input: { subject: 'Plan collector fix', description: 'Add regression coverage', activeForm: 'Planning collector fix' } },
        { type: 'tool_use', id: 'agent-1', name: 'Agent', input: { description: 'Explore repo', prompt: 'Map collector files', subagent_type: 'explore' } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.subagents_spawned).toBe(1);
  });

  it('does not count failed Claude file edits as changed files', async () => {
    const sessionFile = join(dir, 'claude-failed-edit-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-failed-edit-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'write-failed', name: 'Write', input: { file_path: join(dir, 'src', 'failed-create.ts'), content: 'export const failed = true;\\n' } },
        { type: 'tool_use', id: 'edit-ok', name: 'Edit', input: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\\n' } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-failed-edit-session', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'write-failed', content: 'Permission denied', is_error: true },
        { type: 'tool_result', tool_use_id: 'edit-ok', content: 'Updated src/api.ts' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified', lines_added: 1, lines_removed: 1 }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/failed-create.ts');
    expect(metrics?.files_changed).toBe(1);
  });

  it('extracts Codex patch files, line counts, tokens, and failed commands from a session file', async () => {
    const sessionFile = join(dir, 'codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-session-1', cwd: dir } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 40, cached_input_tokens: 10, output_tokens: 20 } } } },
      { timestamp: '2026-05-20T00:00:10Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'call-test' } },
      { timestamp: '2026-05-20T00:00:11Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'call-test', output: 'Process exited with code 1\nFAIL tests/api.test.ts' } },
      { timestamp: '2026-05-20T00:00:12Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'api.ts')]: { type: 'update', unified_diff: '@@\n-export const ok = true;\n+export const ok = false;\n+export const changed = true;\n' },
        [join(dir, 'README.md')]: { type: 'add', content: '# AgentFeed\n\nCodex session support\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.session_id).toBe('codex-session-1');
    expect(metrics?.tokens_used).toBe(70);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(0);
    expect(metrics?.failed_commands).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['README.md', 'src/api.ts']);
    expect(metrics?.lines_added).toBe(5);
    expect(metrics?.lines_removed).toBe(1);
  });

  it('extracts Codex model from turn_context rows when session_meta omits it', async () => {
    const sessionFile = join(dir, 'codex-turn-context-model.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-turn-context-model', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'turn_context', payload: { cwd: dir, model: 'gpt-5.5', effort: 'high' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'model.ts')]: { type: 'add', content: 'export const model = true;\\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.session_id).toBe('codex-turn-context-model');
    expect(metrics?.model).toBe('gpt-5.5');
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/model.ts']);
  });

  it('falls back to Codex apply_patch custom tool input when patch_apply_end is absent', async () => {
    const sessionFile = join(dir, 'codex-apply-patch-only.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-apply-patch-only', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'patch-only', input: [
        '*** Begin Patch',
        `*** Update File: ${join(dir, 'src', 'api.ts')}`,
        '@@',
        '-export const ok = true;',
        '+export const ok = false;',
        '+export const patched = true;',
        `*** Add File: ${join(dir, 'src', 'created.ts')}`,
        '+export const created = true;',
        '*** End Patch'
      ].join('\n') } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/api.ts', 'src/created.ts']);
    expect(metrics?.lines_added).toBe(3);
    expect(metrics?.lines_removed).toBe(1);
    expect(metrics?.tool_calls).toBe(1);
  });

  it('keeps Codex apply_patch fallback files that do not appear in structured patch_apply_end changes', async () => {
    const sessionFile = join(dir, 'codex-mixed-patch-evidence.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-mixed-patch-evidence', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'fallback-patch', input: [
        '*** Begin Patch',
        `*** Add File: ${join(dir, 'src', 'fallback-only.ts')}`,
        '+export const fallbackOnly = true;',
        '*** End Patch'
      ].join('\n') } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'structured-patch', input: [
        '*** Begin Patch',
        `*** Add File: ${join(dir, 'src', 'structured.ts')}`,
        '+export const structured = true;',
        '*** End Patch'
      ].join('\n') } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'structured.ts')]: { type: 'add', content: 'export const structured = true;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/fallback-only.ts', 'src/structured.ts']);
    expect(metrics?.lines_added).toBe(2);
    expect(metrics?.tool_calls).toBe(2);
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
    expect(metrics?.tests_run).toBe(3);
    expect(metrics?.tests_passed).toBe(2);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('recognizes direct test runner commands in Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-direct-test-commands.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-direct-test-commands', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'pytest tests -q', workdir: dir }), call_id: 'pytest-direct' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'pytest-direct', output: 'Process exited with code 0\n24 passed' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'vitest run', workdir: dir }), call_id: 'vitest-direct' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'vitest-direct', output: 'Process exited with code 0\nTest Files: 0 failed, 4 passed, 4 total' } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'playwright test', workdir: dir }), call_id: 'playwright-direct' } },
      { timestamp: '2026-05-20T00:00:06Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'playwright-direct', output: 'Process exited with code 1\n1 failed, 2 passed' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(3);
    expect(metrics?.tests_run).toBe(3);
    expect(metrics?.tests_passed).toBe(2);
    expect(metrics?.failed_commands).toBe(1);
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

  it('matches session files by structured cwd fields, not arbitrary transcript text', async () => {
    const sessionFile = join(dir, 'wrong-project-mentions-this-one.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'user', cwd: '/tmp/other-project', sessionId: 'wrong', message: { role: 'user', content: `please inspect ${dir}` } },
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'also-wrong', cwd: '/tmp/other-project' } }
    ]);

    await expect(sessionFileBelongsToProject(sessionFile, dir)).resolves.toBe(false);
  });

  it('rejects explicit session files whose structured cwd belongs to another project', async () => {
    const sessionFile = join(dir, 'wrong-project-codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'wrong-project-codex', cwd: '/tmp/other-project' } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: { total_tokens: 9999 } } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: '/tmp/other-project' }), call_id: 'other-test' } }
    ]);

    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile })).resolves.toBeNull();
  });

  it('uses session metrics when creating a draft from a clean git tree', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-session-2', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'collectors', 'agent-session.ts')]: { type: 'add', content: 'export const collector = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile });
    const draftJson = await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8');

    expect(draft.source.session_id).toBe('codex-session-2');
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.metrics.lines_added).toBe(1);
    expect(draft.worklog.changed_areas).toContain('Authentication');
    expect(draftJson).not.toContain('export const collector = true');
  });

  it('merges git dirty files with agent session changed files when creating a draft', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\nexport const apiChanged = true;\n');
    const sessionFile = join(dir, '.agentfeed', 'codex-mixed-git-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'codex-mixed-git-session', cwd: dir } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'worker.ts')]: { type: 'add', content: 'export const worker = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.metrics.files_changed).toBe(2);
    expect(draft.worklog.metrics.lines_added).toBe(3);
    expect(draft.worklog.metrics.lines_removed).toBe(1);
    expect(draft.worklog.changed_areas).toContain('API layer');
    expect(draft.worklog.changed_areas).toContain('Application code');
  });

  it('resolves relative session files from the invocation cwd when collecting from a subdirectory', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'codex-subdir-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-subdir-session', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'subdir.ts')]: { type: 'add', content: 'export const fromSubdir = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: join(dir, 'src'), source: 'codex', sessionFile: '../codex-subdir-session.jsonl' });

    expect(draft.source.session_id).toBe('codex-subdir-session');
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.metrics.lines_added).toBe(1);
  });

  it('auto-detects Codex when collect receives a Codex session file without an explicit source', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-auto-source', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex.ts')]: { type: 'add', content: 'export const fromCodex = true;\\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.source.session_id).toBe('codex-auto-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
  });

  it('sniffs an explicit Codex session file even when Codex auto discovery is disabled', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = true;
    config.agents.codex.enabled = false;
    config.agents.cursor.enabled = false;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    const sessionFile = join(dir, 'codex-disabled-auto-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-disabled-auto-source', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-disabled-auto.ts')]: { type: 'add', content: 'export const fromDisabledCodex = true;\\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.source.session_id).toBe('codex-disabled-auto-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
  });

  it('respects enabled agent config when auto-selecting session sources', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = false;
    config.agents.codex.enabled = true;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    const sessionFile = join(dir, '.agentfeed', 'mixed-source-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'disabled-claude-source', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'claude-disabled.ts'), content: 'export const claude = true;\\n' } }
      ] } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'session_meta', payload: { id: 'enabled-codex-source', cwd: dir } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-enabled.ts')]: { type: 'add', content: 'export const codex = true;\\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.source.session_id).toBe('enabled-codex-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.changed_areas).toContain('Application code');
  });

  it('allows explicit source to override disabled agent config', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = false;
    config.agents.codex.enabled = true;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    const sessionFile = join(dir, '.agentfeed', 'claude-explicit-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'explicit-claude-source', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'claude-explicit.ts'), content: 'export const claude = true;\\n' } }
      ] } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.agent).toBe('claude_code');
    expect(draft.source.agent).toBe('claude_code');
    expect(draft.source.session_id).toBe('explicit-claude-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
  });

  it('extracts Gemini CLI tool calls, Superpowers skill use, tokens, and file edits', async () => {
    const sessionFile = join(dir, 'gemini-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-session-1', projectHash: 'hash', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:02:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { input: 10, cached: 5, output: 3, thoughts: 2, total: 20 }, toolCalls: [
        { id: 'tool-1', name: 'activate_skill', status: 'success', args: { skill_name: 'test-driven-development' } },
        { id: 'tool-2', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'gemini.ts'), content: 'export const gemini = true;\\n' } },
        { id: 'tool-3', name: 'replace', status: 'success', args: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\\n' } },
        { id: 'tool-4', name: 'run_shell_command', status: 'error', args: { command: 'npm test' }, resultDisplay: 'Process exited with code 1\\nFAIL' },
        { id: 'tool-5', name: 'update_topic', status: 'success', args: { title: 'Collector work', summary: 'Added session collector', strategic_intent: 'Improve collection' } }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.session_id).toBe('gemini-session-1');
    expect(metrics?.model).toBe('gemini-3-flash-preview');
    expect(metrics?.tokens_used).toBe(20);
    expect(metrics?.duration_seconds).toBe(120);
    expect(metrics?.tool_calls).toBe(5);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.skills_used).toBe(1);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(0);
    expect(metrics?.failed_commands).toBe(1);
    expect(metrics?.agent_turns).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/api.ts', 'src/gemini.ts']);
  });

  it('does not count failed Gemini skill or agent activation as completed usage', async () => {
    const sessionFile = join(dir, 'gemini-failed-skill-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-failed-skill-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'activate_skill', status: 'error', args: { skill_name: 'test-driven-development' }, resultDisplay: 'Skill not found' },
        { id: 'tool-2', name: 'invoke_agent', status: 'error', args: { agent_name: 'explore', prompt: 'Map files' }, resultDisplay: 'Agent unavailable' },
        { id: 'tool-3', name: 'run_shell_command', status: 'success', args: { command: 'npm test' }, resultDisplay: 'Process exited with code 0\\nPASS\\nTest Files: 0 failed, 1 passed, 1 total' }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.tool_calls).toBe(3);
    expect(metrics?.skills_used).toBeNull();
    expect(metrics?.subagents_spawned).toBeNull();
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBeNull();
    expect(metrics?.collection_sources).toEqual([
      { type: 'agent_session', name: 'gemini_cli', quality: 'high' }
    ]);
  });

  it('does not count failed Gemini file edits as changed files', async () => {
    const sessionFile = join(dir, 'gemini-failed-edit-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-failed-edit-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'write_file', status: 'error', args: { file_path: join(dir, 'src', 'failed-create.ts'), content: 'export const failed = true;\\n' }, resultDisplay: 'Permission denied' },
        { id: 'tool-2', name: 'replace', status: 'failed', args: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\\n' }, resultDisplay: 'Old string not found' },
        { id: 'tool-3', name: 'run_shell_command', status: 'success', args: { command: 'npm test' }, resultDisplay: 'Process exited with code 0\\nPASS' }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.tool_calls).toBe(3);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.lines_added).toBeNull();
    expect(metrics?.lines_removed).toBeNull();
    expect(metrics?.tests_passed).toBe(1);
  });

  it('auto-detects Gemini CLI when collect receives a Gemini session file without an explicit source', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'gemini-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-auto-source', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:00:01Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:01Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 10 }, toolCalls: [
        { id: 'tool-1', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'gemini.ts'), content: 'export const gemini = true;\\n' } }
      ] }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile });

    expect(draft.worklog.agent).toBe('gemini_cli');
    expect(draft.source.agent).toBe('gemini_cli');
    expect(draft.source.session_id).toBe('gemini-auto-source');
    expect(draft.worklog.metrics.tool_calls).toBe(1);
    expect(draft.worklog.metrics.tokens_used).toBe(10);
  });

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
  });

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

  it('excludes agent metadata paths reported by session files from public changed-file evidence', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, '.agentfeed', 'codex-metadata-paths.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'codex-metadata-paths', cwd: dir } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, '.omx', 'metrics.json')]: { type: 'add', content: '{"session_total_tokens":999}\n' },
        [join(dir, '.cursor', 'session-metrics.json')]: { type: 'add', content: '{"tokens_used":999}\n' },
        [join(dir, '.agentfeed', 'drafts', 'internal.json')]: { type: 'add', content: '{"raw":"internal"}\n' },
        [join(dir, '.DS_Store')]: { type: 'add', content: 'local finder metadata' },
        [join(dir, 'obsidian-vault', '.obsidian', 'app.json')]: { type: 'add', content: '{"alwaysUpdateLinks":true}\n' },
        [join(dir, 'src', 'public.ts')]: { type: 'add', content: 'export const publicEvidence = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.metrics.lines_added).toBe(1);
    expect(draft.worklog.changed_areas).toContain('Application code');
    expect(draft.source.collection_fingerprint).toBeTruthy();
    expect(draft.worklog.metrics.collection_sources).toContainEqual({ type: 'agent_session', name: 'codex', quality: 'high' });
    expect(JSON.stringify(draft)).not.toContain('.omx');
    expect(JSON.stringify(draft)).not.toContain('.cursor');
    expect(JSON.stringify(draft)).not.toContain('.agentfeed/drafts');
    expect(JSON.stringify(draft)).not.toContain('.DS_Store');
    expect(JSON.stringify(draft)).not.toContain('.obsidian');
  });

  it('stores explicit collection windows on created drafts', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'codex-window-draft.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-window-draft', cwd: dir } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'window.ts')]: { type: 'add', content: 'export const windowed = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.source.collection_window).toEqual({ since: '2026-05-20T01:00:00.000Z', until: '2026-05-20T02:00:00.000Z' });
    expect(draft.worklog.changed_areas).toContain('Application code');
  });

});

// P0: collection window filtering keeps long-lived sessions from over-counting old work.
describe('collection window filtering', () => {
  it('auto-slices Claude, Codex, and Gemini sessions after a long idle gap', async () => {
    const claudeSessionFile = join(dir, 'claude-idle-gap-session.jsonl');
    await writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-idle-gap-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-idle-gap-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'new-claude.ts'), content: 'export const newClaude = true;\n' } }
      ] } }
    ]);

    const codexSessionFile = join(dir, 'codex-idle-gap-session.jsonl');
    await writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-idle-gap-session', cwd: dir } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'old-codex.ts')]: { type: 'add', content: 'export const oldCodex = true;\n' }
      } } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'new-codex.ts')]: { type: 'add', content: 'export const newCodex = true;\n' }
      } } }
    ]);

    const geminiSessionFile = join(dir, 'gemini-idle-gap-session.jsonl');
    await writeJsonl(geminiSessionFile, [
      { sessionId: 'gemini-idle-gap-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:02:00Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:02:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [
        { id: 'tool-new', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'new-gemini.ts'), content: 'export const newGemini = true;\n' } }
      ] }
    ]);

    const claude = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile: claudeSessionFile });
    const codex = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile: codexSessionFile });
    const gemini = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile: geminiSessionFile });

    expect(claude?.tokens_used).toBe(15);
    expect(claude?.changed_files.map((file) => file.path)).toEqual(['src/new-claude.ts']);
    expect(claude?.collection_window?.since).toBe('2026-05-20T01:00:00.000Z');

    expect(codex?.session_id).toBe('codex-idle-gap-session');
    expect(codex?.tokens_used).toBe(65);
    expect(codex?.changed_files.map((file) => file.path)).toEqual(['src/new-codex.ts']);
    expect(codex?.collection_window?.since).toBe('2026-05-20T01:01:00.000Z');

    expect(gemini?.tokens_used).toBe(15);
    expect(gemini?.changed_files.map((file) => file.path)).toEqual(['src/new-gemini.ts']);
    expect(gemini?.collection_window?.since).toBe('2026-05-20T01:00:00.000Z');
  });

  it('ignores agent session files with no rows inside the collection window', async () => {
    const claudeSessionFile = join(dir, 'claude-outside-window.jsonl');
    await writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-outside-window', timestamp: '2026-05-20T00:59:59Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } }
    ]);
    const codexSessionFile = join(dir, 'codex-outside-window.jsonl');
    await writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-outside-window', cwd: dir } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 50 } } } }
    ]);
    const geminiSessionFile = join(dir, 'gemini-outside-window.jsonl');
    await writeJsonl(geminiSessionFile, [
      { sessionId: 'gemini-outside-window', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:59:59Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:59:59Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] }
    ]);

    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile: claudeSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile: codexSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile: geminiSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
  });

  it('filters Claude metrics and edits before --since inclusively at the boundary', async () => {
    const sessionFile = join(dir, 'claude-window-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-window-session', timestamp: '2026-05-20T00:59:59Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-window-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'new-claude.ts'), content: 'export const newClaude = true;\n' } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('claude-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-claude.ts']);
  });

  it('filters Gemini metrics and edits before --since inclusively at the boundary', async () => {
    const sessionFile = join(dir, 'gemini-window-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-window-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:59:59Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:59:59Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [
        { id: 'tool-new', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'new-gemini.ts'), content: 'export const newGemini = true;\n' } }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('gemini-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-gemini.ts']);
  });

  it('clamps Gemini session duration to --since collection window', async () => {
    const sessionFile = join(dir, 'gemini-duration-window.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-duration-window', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T01:20:00Z', kind: 'main' },
      { id: 'g-new', timestamp: '2026-05-20T01:10:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('gemini-duration-window');
    expect(metrics?.duration_seconds).toBe(1200);
  });

  it('filters Codex metrics and file edits before --since while preserving session identity', async () => {
    const sessionFile = join(dir, 'codex-window-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-window-session', cwd: dir } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 50 } } } },
      { timestamp: '2026-05-20T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'old.ts')]: { type: 'add', content: 'export const oldWork = true;\n' }
      } } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 10, output_tokens: 5 } } } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'new.ts')]: { type: 'add', content: 'export const newWork = true;\nexport const stillNew = true;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('codex-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new.ts']);
    expect(metrics?.lines_added).toBe(2);
  });

  it('subtracts the pre-window Codex cumulative token baseline', async () => {
    const sessionFile = join(dir, 'codex-cumulative-token-window.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-cumulative-token-window', cwd: dir } },
      { timestamp: '2026-05-20T00:59:59Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T01:10:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 180 } } } },
      { timestamp: '2026-05-20T01:20:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('codex-cumulative-token-window');
    expect(metrics?.tokens_used).toBe(65);
  });

  it('does not let cumulative OMX token metadata override a windowed Codex delta', async () => {
    await mkdir(join(dir, '.omx'), { recursive: true });
    await writeFile(join(dir, '.omx', 'metrics.json'), JSON.stringify({ session_total_tokens: 1000 }));
    const sessionFile = join(dir, 'codex-omx-cumulative-token-window.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-omx-cumulative-token-window', cwd: dir } },
      { timestamp: '2026-05-20T00:59:59Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T01:10:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(65);
    expect(metrics?.collection_sources).toContainEqual({ type: 'plugin_metadata', name: 'omx', quality: 'medium' });
  });
});
