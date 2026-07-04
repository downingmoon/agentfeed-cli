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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-claude-'));
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

describe('Claude session collector metrics', () => {
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
    expect(metrics?.duration_seconds).toBe(20);
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
    expect(metrics?.tests_run).toBe(19);
    expect(metrics?.tests_passed).toBe(19);
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

  it('does not count unconfirmed Claude file edits as changed files', async () => {
    const sessionFile = join(dir, 'claude-unconfirmed-edit-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-unconfirmed-edit-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'write-started', name: 'Write', input: { file_path: join(dir, 'src', 'unconfirmed.ts'), content: 'export const unconfirmed = true;\\n' } },
        { type: 'tool_use', id: 'edit-ok', name: 'Edit', input: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\\n' } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-unconfirmed-edit-session', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'edit-ok', content: 'Updated src/api.ts' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified', lines_added: 1, lines_removed: 1 }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/unconfirmed.ts');
    expect(metrics?.files_changed).toBe(1);
  });

  it('captures files created by successful Claude Bash heredoc commands', async () => {
    const sessionFile = join(dir, 'claude-shell-created-files.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-shell-created-files', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'bash-create', name: 'Bash', input: { command: [
          'mkdir -p scripts/preview',
          "cat > scripts/preview/index-page.mjs <<'EOF'",
          'export const page = true;',
          'EOF'
        ].join('\n') } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-shell-created-files', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'bash-create', content: 'Process exited with code 0\n' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['scripts/preview/index-page.mjs']);
    expect(metrics?.files_changed).toBe(1);
    expect(metrics?.lines_added).toBe(1);
  });

  it('captures changed paths from successful Claude Bash git status output', async () => {
    const sessionFile = join(dir, 'claude-git-status-output.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-git-status-output', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'bash-status', name: 'Bash', input: { command: 'git status --short' } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-git-status-output', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'bash-status', content: 'Process exited with code 0\n?? scripts/preview/branches.mjs\n M src/api.ts\n' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.changed_files.map((file) => [file.path, file.status]).sort()).toEqual([
      ['scripts/preview/branches.mjs', 'added'],
      ['src/api.ts', 'modified']
    ]);
    expect(metrics?.lines_added).toBeNull();
  });

  it('does not count failed Claude Bash shell file evidence', async () => {
    const sessionFile = join(dir, 'claude-failed-shell-files.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-failed-shell-files', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'bash-failed', name: 'Bash', input: { command: "cat > src/failed.ts <<'EOF'\nexport const failed = true;\nEOF" } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-failed-shell-files', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'bash-failed', content: 'Process exited with code 1\nPermission denied', is_error: true }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.failed_commands).toBe(1);
  });

});
