import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';

let dir: string;

async function writeJsonl(path: string, rows: unknown[]): Promise<void> {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-codex-node-tap-'));
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

describe('Codex session collector Node TAP metrics', () => {
  it('marks node --test TAP output with nonzero fail count as a failed command', async () => {
    const sessionFile = join(dir, 'codex-node-tap-fail-count.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-node-tap-fail-count', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'node --test unit.test.js', workdir: dir }), call_id: 'node-test' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'node-test', output: '# tests 4\n# suites 0\n# pass 3\n# fail 1' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(4);
    expect(metrics?.tests_passed).toBe(3);
    expect(metrics?.failed_commands).toBe(1);
  });
});
