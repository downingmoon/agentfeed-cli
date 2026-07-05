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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-gemini-metrics-'));
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

describe('agent session Gemini metrics', () => {
  it('extracts Gemini-family JSONL tool calls, Superpowers skill use, tokens, and file edits', async () => {
    const sessionFile = join(dir, 'gemini-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-session-1', projectHash: 'hash', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:02:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { input: 10, cached: 5, output: 3, thoughts: 2, total: 20 }, toolCalls: [
        { id: 'tool-1', name: 'activate_skill', status: 'success', args: { skill_name: 'test-driven-development' } },
        { id: 'tool-2', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'gemini.ts'), content: 'export const gemini = true;\n' } },
        { id: 'tool-3', name: 'replace', status: 'success', args: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\n' } },
        { id: 'tool-4', name: 'run_shell_command', status: 'error', args: { command: 'npm test' }, resultDisplay: 'Process exited with code 1\nFAIL' },
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

  it('uses the first in-window Gemini model for partial collection windows', async () => {
    const sessionFile = join(dir, 'gemini-window-model.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-window-model', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T01:05:00Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:30:00Z', type: 'gemini', model: 'gemini-2.5-pro', tokens: { total: 100 }, toolCalls: [] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.model).toBe('gemini-3-flash-preview');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.agent_turns).toBe(1);
  });

  it('does not count failed Gemini skill or agent activation as completed usage', async () => {
    const sessionFile = join(dir, 'gemini-failed-skill-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-failed-skill-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'activate_skill', status: 'error', args: { skill_name: 'test-driven-development' }, resultDisplay: 'Skill not found' },
        { id: 'tool-2', name: 'invoke_agent', status: 'error', args: { agent_name: 'explore', prompt: 'Map files' }, resultDisplay: 'Agent unavailable' },
        { id: 'tool-3', name: 'run_shell_command', status: 'success', args: { command: 'npm test' }, resultDisplay: 'Process exited with code 0\nPASS\nTest Files: 0 failed, 1 passed, 1 total' }
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
        { id: 'tool-1', name: 'write_file', status: 'error', args: { file_path: join(dir, 'src', 'failed-create.ts'), content: 'export const failed = true;\n' }, resultDisplay: 'Permission denied' },
        { id: 'tool-2', name: 'replace', status: 'failed', args: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\n' }, resultDisplay: 'Old string not found' },
        { id: 'tool-3', name: 'run_shell_command', status: 'success', args: { command: 'npm test' }, resultDisplay: 'Process exited with code 0\nPASS' }
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

  it('captures files created by successful Gemini shell heredoc commands', async () => {
    const sessionFile = join(dir, 'gemini-shell-created-files.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-shell-created-files', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'run_shell_command', status: 'success', args: { command: "cat > scripts/preview/index-page.mjs <<'EOF'\nexport const page = true;\nEOF" }, resultDisplay: 'Process exited with code 0\n' }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['scripts/preview/index-page.mjs']);
    expect(metrics?.files_changed).toBe(1);
    expect(metrics?.lines_added).toBe(1);
  });

  it('captures changed paths from successful Gemini git status output', async () => {
    const sessionFile = join(dir, 'gemini-git-status-output.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-git-status-output', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'run_shell_command', status: 'success', args: { command: 'git status --short' }, resultDisplay: 'Process exited with code 0\n?? scripts/preview/branches.mjs\n M src/api.ts\n' }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.changed_files.map((file) => [file.path, file.status]).sort()).toEqual([
      ['scripts/preview/branches.mjs', 'added'],
      ['src/api.ts', 'modified']
    ]);
    expect(metrics?.lines_added).toBeNull();
  });

  it('does not count failed Gemini shell file evidence', async () => {
    const sessionFile = join(dir, 'gemini-failed-shell-files.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-failed-shell-files', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'run_shell_command', status: 'error', args: { command: "cat > src/failed.ts <<'EOF'\nexport const failed = true;\nEOF" }, resultDisplay: 'Process exited with code 1\nPermission denied' }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.failed_commands).toBe(1);
  });

  it('parses Antigravity CLI transcripts as Gemini-compatible session evidence', async () => {
    const sessionFile = join(dir, 'antigravity-transcript.jsonl');
    await writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: `<USER_REQUEST>Update ${join(dir, 'src', 'api.ts')}</USER_REQUEST>` },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tokens: { input: 100, cached: 20, output: 30, thoughts: 5, tool: 7 }, tool_calls: [
        { name: 'run_command', args: { CommandLine: '"git status --short"', Cwd: JSON.stringify(dir) } }
      ] },
      { step_index: 2, source: 'MODEL', type: 'RUN_COMMAND', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Created At: 2026-06-25T03:56:21Z\nCompleted At: 2026-06-25T03:56:22Z\nThe command completed successfully.\nOutput:\n?? src/agy-created.ts\n M src/api.ts\n' },
      { step_index: 3, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:23Z', content: `Created file file://${join(dir, 'src', 'agy-created.ts')} with requested content.` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.session_id).toBe('antigravity-transcript');
    expect(metrics?.tokens_used).toBe(162);
    expect(metrics?.duration_seconds).toBe(8);
    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.changed_files.map((file) => [file.path, file.status]).sort()).toEqual([
      ['src/agy-created.ts', 'added'],
      ['src/api.ts', 'modified']
    ]);
    expect(metrics?.collection_sources).toEqual([
      { type: 'agent_session', name: 'gemini_cli', quality: 'high' },
      { type: 'agent_session', name: 'antigravity_cli', quality: 'high' }
    ]);
  });

  it('does not count Antigravity planned shell file evidence when command fails', async () => {
    const sessionFile = join(dir, 'antigravity-failed-command-transcript.jsonl');
    await writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Create generated file</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'run_command', args: { CommandLine: JSON.stringify("cat > src/failed-antigravity.ts <<'EOF'\nexport const failed = true;\nEOF"), Cwd: JSON.stringify(dir) } }
      ] },
      { step_index: 2, source: 'MODEL', type: 'RUN_COMMAND', status: 'FAILED', created_at: '2026-06-25T03:56:21Z', content: 'Command failed.\nOutput:\npermission denied\n' }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.lines_added).toBeNull();
  });

});
