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

describe('Codex session collector evidence metrics', () => {
  it('captures changed paths from Codex parallel apply_patch tool wrappers', async () => {
    const sessionFile = join(dir, 'codex-parallel-apply-patch-wrapper.jsonl');
    const patch = [
      '*** Begin Patch',
      '*** Add File: src/generated-parallel-patch.ts',
      '+export const parallel = true;',
      '*** End Patch'
    ].join('\n');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-parallel-apply-patch-wrapper', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'multi_tool_use.parallel', arguments: JSON.stringify({
        tool_uses: [
          { recipient_name: 'functions.apply_patch', parameters: { input: patch } }
        ]
      }), call_id: 'parallel-patch' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'parallel-patch', output: 'Success. Updated the following files:\nA src/generated-parallel-patch.ts' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
      ['src/generated-parallel-patch.ts', 'added', 1]
    ]);
    expect(metrics?.files_changed).toBe(1);
    expect(metrics?.lines_added).toBe(1);
    expect(metrics?.tool_calls).toBe(1);
  });

  it('captures files created by successful Codex shell heredoc commands', async () => {
    const sessionFile = join(dir, 'codex-shell-created-files.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-shell-created-files', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: [
        'mkdir -p scripts/preview',
        "cat > scripts/preview/index-page.mjs <<'EOF'",
        'export const page = true;',
        'EOF',
        "cat > scripts/preview/index.css <<'EOF'",
        '.hero { color: red; }',
        'EOF'
      ].join('\n'), workdir: dir }), call_id: 'shell-create' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'shell-create', output: 'Process exited with code 0\n' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['scripts/preview/index-page.mjs', 'scripts/preview/index.css']);
    expect(metrics?.files_changed).toBe(2);
    expect(metrics?.lines_added).toBe(2);
  });

  it('captures changed paths from Codex function_call apply_patch arguments', async () => {
    const sessionFile = join(dir, 'codex-function-call-apply-patch.jsonl');
    const patch = [
      '*** Begin Patch',
      '*** Add File: src/generated-function-patch.ts',
      '+export const first = true;',
      '+export const second = true;',
      '*** Update File: src/api.ts',
      '@@',
      '-export const ok = true;',
      '+export const ok = false;',
      '*** End Patch'
    ].join('\n');
    const structuredPatch = [
      '*** Begin Patch',
      '*** Add File: src/generated-structured-function-patch.ts',
      '+export const structured = true;',
      '*** End Patch'
    ].join('\n');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-function-call-apply-patch', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'functions.apply_patch', arguments: patch, call_id: 'patch-function' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'patch-function', output: 'Success. Updated the following files:\nA src/generated-function-patch.ts\nM src/api.ts' } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'function_call', name: 'functions.apply_patch', arguments: JSON.stringify({ input: structuredPatch }), call_id: 'patch-function-structured' } },
      { timestamp: '2026-05-20T00:00:04Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'patch-function-structured', output: 'Success. Updated the following files:\nA src/generated-structured-function-patch.ts' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => [file.path, file.status, file.lines_added, file.lines_removed]).sort()).toEqual([
      ['src/api.ts', 'modified', 1, 1],
      ['src/generated-function-patch.ts', 'added', 2, 0],
      ['src/generated-structured-function-patch.ts', 'added', 1, 0]
    ]);
    expect(metrics?.files_changed).toBe(3);
    expect(metrics?.lines_added).toBe(4);
    expect(metrics?.lines_removed).toBe(1);
  });

  it('captures changed paths from Codex git status shell output', async () => {
    const sessionFile = join(dir, 'codex-git-status-output.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-git-status-output', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'git status --short', workdir: dir }), call_id: 'git-status' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'git-status', output: 'Process exited with code 0\n?? scripts/preview/branches.mjs\n M src/api.ts\n' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => [file.path, file.status]).sort()).toEqual([
      ['scripts/preview/branches.mjs', 'added'],
      ['src/api.ts', 'modified']
    ]);
    expect(metrics?.lines_added).toBeNull();
    expect(metrics?.lines_removed).toBeNull();
  });
});
