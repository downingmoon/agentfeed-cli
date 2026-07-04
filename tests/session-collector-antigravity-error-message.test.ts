import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

describe('Antigravity error message recovery', () => {
  const fixture = useSessionCollectorFixture();

  it('does not let an error-message stale planned code action suppress a later direct code action count', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-stale-code-action-error.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'write_to_file', args: { TargetFile: JSON.stringify(join(dir, 'src', 'stale.ts')) } }
      ] },
      { step_index: 1, source: 'MODEL', type: 'ERROR_MESSAGE', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Error invalid tool call: invalid_args' },
      { step_index: 2, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:22Z', content: `Modified file file://${join(dir, 'src', 'stale.ts')}` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.tool_calls).toBe(2);
    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/stale.ts', status: 'modified' }
    ]);
  });

  it('does not let an error-message stale planned command claim later unpaired command output file evidence', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-stale-command-error.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tool_calls: [
        { name: 'run_command', args: { CommandLine: '"git status --short"', Cwd: JSON.stringify(dir) } }
      ] },
      { step_index: 1, source: 'MODEL', type: 'ERROR_MESSAGE', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Error invalid tool call: invalid_args' },
      { step_index: 2, source: 'MODEL', type: 'RUN_COMMAND', status: 'DONE', created_at: '2026-06-25T03:56:22Z', content: 'Output:\n?? src/stale-command.ts\n' }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
  });
});
