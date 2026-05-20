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

  it('does not treat non-test command failures as failed tests', async () => {
    const sessionFile = join(dir, 'codex-failed-shell.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-session-commands', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'test-ok' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'test-ok', output: 'Process exited with code 0\\nPASS tests/api.test.ts' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'git diff --check', workdir: dir }), call_id: 'lint-fail' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'lint-fail', output: 'Process exited with code 1\\nwhitespace error' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('matches session files by structured cwd fields, not arbitrary transcript text', async () => {
    const sessionFile = join(dir, 'wrong-project-mentions-this-one.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'user', cwd: '/tmp/other-project', sessionId: 'wrong', message: { role: 'user', content: `please inspect ${dir}` } },
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'also-wrong', cwd: '/tmp/other-project' } }
    ]);

    await expect(sessionFileBelongsToProject(sessionFile, dir)).resolves.toBe(false);
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
});
