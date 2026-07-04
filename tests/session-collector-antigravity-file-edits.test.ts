import { describe, expect, it } from 'vitest';
import { mkdir, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

describe('Antigravity file edit evidence', () => {
  const fixture = useSessionCollectorFixture();

  it('auto-discovers the newest matching Antigravity transcript', async () => {
    const dir = fixture.dir();
    const previousHome = process.env.HOME;
    const home = join(dir, 'home');
    process.env.HOME = home;
    try {
      const oldTranscript = join(home, '.gemini', 'antigravity-cli', 'brain', '000-old-conversation', '.system_generated', 'logs', 'transcript.jsonl');
      const newTranscript = join(home, '.gemini', 'antigravity-cli', 'brain', '999-new-conversation', '.system_generated', 'logs', 'transcript.jsonl');
      await mkdir(join(oldTranscript, '..'), { recursive: true });
      await mkdir(join(newTranscript, '..'), { recursive: true });
      await fixture.writeJsonl(oldTranscript, [
        { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: `Update file://${join(dir, 'src', 'api.ts')}` },
        { step_index: 1, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:23Z', content: `Created file file://${join(dir, 'src', 'old-antigravity.ts')} with requested content.` }
      ]);
      await fixture.writeJsonl(newTranscript, [
        { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T04:56:15Z', content: `Update file://${join(dir, 'src', 'api.ts')}` },
        { step_index: 1, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T04:56:23Z', content: `Created file file://${join(dir, 'src', 'new-antigravity.ts')} with requested content.` }
      ]);
      await utimes(oldTranscript, new Date('2026-06-25T03:57:00Z'), new Date('2026-06-25T03:57:00Z'));
      await utimes(newTranscript, new Date('2026-06-25T04:57:00Z'), new Date('2026-06-25T04:57:00Z'));

      const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli' });

      expect(metrics?.session_id).toBe('999-new-conversation');
      expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-antigravity.ts']);
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('pairs Antigravity command results by transcript step order instead of file order', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-out-of-order-command.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Check changed files</USER_REQUEST>' },
      { step_index: 2, source: 'MODEL', type: 'RUN_COMMAND', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Created At: 2026-06-25T03:56:21Z\nCompleted At: 2026-06-25T03:56:22Z\nThe command completed successfully.\nOutput:\n?? src/out-of-order.ts\n' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'run_command', args: { CommandLine: '"git status --short"', Cwd: JSON.stringify(dir) } }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.changed_files.map((file) => [file.path, file.status])).toEqual([
      ['src/out-of-order.ts', 'added']
    ]);
  });


  it('extracts Antigravity spawned subagent counts from invoke rows', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-subagents.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Use subagents</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'invoke_subagent', args: { Subagents: JSON.stringify([{ Role: 'Builder A' }, { Role: 'Builder B' }]) } }
      ] },
      { step_index: 2, source: 'MODEL', type: 'INVOKE_SUBAGENT', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Created the following subagents:\n{\n  "conversationId": "subagent-a"\n}\n{\n  "conversationId": "subagent-b"\n}' }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.subagents_spawned).toBe(2);
    expect(metrics?.subagents_completed).toBeNull();
  });

  it('extracts Antigravity completed subagent counts from child system messages', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-completed-subagents.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Use subagents</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'invoke_subagent', args: { Subagents: JSON.stringify([{ Role: 'Builder A' }, { Role: 'Builder B' }, { Role: 'Builder C' }]) } }
      ] },
      { step_index: 2, source: 'MODEL', type: 'INVOKE_SUBAGENT', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Created the following subagents:\n{\n  "conversationId": "subagent-a"\n}\n{\n  "conversationId": "subagent-b"\n}\n{\n  "conversationId": "subagent-c"\n}' },
      { step_index: 3, source: 'SYSTEM', type: 'SYSTEM_MESSAGE', status: 'DONE', created_at: '2026-06-25T03:57:21Z', content: '<SYSTEM_MESSAGE>\n[Message] timestamp=2026-06-25T03:57:42Z sender=subagent-a priority=MESSAGE_PRIORITY_HIGH content=Created the file `/repo/src/generated.ts`.\n</SYSTEM_MESSAGE>' },
      { step_index: 4, source: 'SYSTEM', type: 'SYSTEM_MESSAGE', status: 'DONE', created_at: '2026-06-25T03:57:22Z', content: '<SYSTEM_MESSAGE>\n[Message] timestamp=2026-06-25T03:57:43Z sender=subagent-b priority=MESSAGE_PRIORITY_HIGH content=I need guidance choosing a file name.\n</SYSTEM_MESSAGE>' },
      { step_index: 5, source: 'SYSTEM', type: 'SYSTEM_MESSAGE', status: 'DONE', created_at: '2026-06-25T03:57:23Z', content: '<SYSTEM_MESSAGE>\n[Message] timestamp=2026-06-25T03:57:44Z sender=subagent-c priority=MESSAGE_PRIORITY_HIGH content=작업 완료: generated requested scene.\n</SYSTEM_MESSAGE>' },
      { step_index: 6, source: 'MODEL', type: 'GENERIC', status: 'DONE', created_at: '2026-06-25T03:57:24Z', content: 'Successfully killed 3 subagent(s) and their descendants.' }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.subagents_spawned).toBe(3);
    expect(metrics?.subagents_completed).toBe(2);
  });


  it('does not count Antigravity code action rows with error text as changed files', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-error-text-code-action.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Edit files</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:20Z', content: `Modified file file://${join(dir, 'src', 'error-text.ts')}\nError: file not found` },
      { step_index: 2, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: `Modified file file://${join(dir, 'src', 'api.ts')}` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified' }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/error-text.ts');
    expect(metrics?.files_changed).toBe(1);
  });

  it('does not double count planned Antigravity code action result rows as tool calls', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-planned-code-action.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Create a file</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'write_to_file', args: { TargetFile: JSON.stringify(join(dir, 'src', 'planned.ts')) } }
      ] },
      { step_index: 2, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: `Created file file://${join(dir, 'src', 'planned.ts')} with requested content.` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/planned.ts', status: 'added' }
    ]);
  });

  it('counts direct Antigravity view rows when no planner tool call is present', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-direct-view.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'MODEL', type: 'VIEW_FILE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', content: `File Path: \`file://${join(dir, 'src', 'api.ts')}\`` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.files_changed).toBeNull();
  });
});
