import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

describe('Claude file edit evidence', () => {
  const fixture = useSessionCollectorFixture();

  it('does not count Claude file edit tool results with error text as changed files', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'claude-error-text-edit-session.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-error-text-edit-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', id: 'write-error-text', name: 'Write', input: { file_path: join(dir, 'src', 'error-text.ts'), content: 'export const wrong = true;\\n' } },
        { type: 'tool_use', id: 'edit-ok', name: 'Edit', input: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\\n' } }
      ] } },
      { type: 'user', cwd: dir, sessionId: 'claude-error-text-edit-session', timestamp: '2026-05-20T00:00:02Z', message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'write-error-text', content: 'Error: file not found' },
        { type: 'tool_result', tool_use_id: 'edit-ok', content: 'Updated src/api.ts' }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified', lines_added: 1, lines_removed: 1 }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/error-text.ts');
    expect(metrics?.files_changed).toBe(1);
  });
});
