import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';

let dir: string;
async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-draft-integration-'));
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

  it('keeps aggregate line counts unknown when session evidence only proves changed paths', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'codex-expression-writes.jsonl');
    const command = [
      "node - <<'JS'",
      "import { writeFileSync } from 'node:fs';",
      "writeFileSync('dist/data.json', JSON.stringify({ ok: true }, null, 2));",
      "fs.writeFileSync('assets/icon.bin', Buffer.from('abc'));",
      'JS'
    ].join('\n');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-expression-writes', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: command, workdir: dir }), call_id: 'node-expression' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'node-expression', output: 'Process exited with code 0' } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T00:00:00Z', until: '2026-05-20T01:00:00Z' });

    expect(draft.worklog.metrics.files_changed).toBe(2);
    expect(draft.worklog.metrics.lines_added).toBeNull();
    expect(draft.worklog.metrics.lines_removed).toBeNull();
    expect(draft.worklog.summary).not.toContain('0 additions');
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
