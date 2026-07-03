import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

describe('Gemini file edit evidence', () => {
  const fixture = useSessionCollectorFixture();

  it('does not count Gemini file edit tool results with error text as changed files', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'gemini-error-text-edit-session.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { sessionId: 'gemini-error-text-edit-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', toolCalls: [
        { id: 'tool-1', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'error-text.ts'), content: 'export const wrong = true;\n' }, resultDisplay: 'Error: file not found' },
        { id: 'tool-2', name: 'replace', status: 'success', args: { file_path: join(dir, 'src', 'api.ts'), old_string: 'true', new_string: 'false\n' }, resultDisplay: 'Updated src/api.ts' }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified', lines_added: 1, lines_removed: 1 }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/error-text.ts');
    expect(metrics?.files_changed).toBe(1);
  });
});
