import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics, sessionFileBelongsToProject } from '../src/collectors/agent-session.js';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';

let dir: string;
const oldHome = process.env.HOME;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-ownership-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  await rm(dir, { recursive: true, force: true });
});

describe('agent session ownership and discovery', () => {
  it('matches session files by structured cwd fields, not arbitrary transcript text', async () => {
    const sessionFile = join(dir, 'wrong-project-mentions-this-one.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'user', cwd: '/tmp/other-project', sessionId: 'wrong', message: { role: 'user', content: `please inspect ${dir}` } },
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'also-wrong', cwd: '/tmp/other-project' } }
    ]);

    await expect(sessionFileBelongsToProject(sessionFile, dir)).resolves.toBe(false);
  });

  it('rejects explicit session files whose structured cwd belongs to another project', async () => {
    const sessionFile = join(dir, 'wrong-project-codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'wrong-project-codex', cwd: '/tmp/other-project' } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: { total_tokens: 9999 } } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: '/tmp/other-project' }), call_id: 'other-test' } }
    ]);

    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile })).resolves.toBeNull();
  });

  it('auto-discovers cwd-less Claude sessions only from the project-scoped transcript directory', async () => {
    const home = join(dir, 'home');
    process.env.HOME = home;
    const projectDirName = dir.replace(/\//g, '-');
    const sessionFile = join(home, '.claude', 'projects', projectDirName, 'claude-project-dir-session.jsonl');
    await mkdir(join(home, '.claude', 'projects', projectDirName), { recursive: true });
    await writeJsonl(sessionFile, [
      { type: 'assistant', sessionId: 'claude-project-dir-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'claude-project-dir.ts'), content: 'export const projectScoped = true;\n' } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code' });

    expect(metrics?.session_id).toBe('claude-project-dir-session');
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/claude-project-dir.ts']);
  });

  it('does not auto-discover cwd-less Codex sessions from the global sessions directory', async () => {
    const home = join(dir, 'home');
    process.env.HOME = home;
    const sessionFile = join(home, '.codex', 'sessions', 'codex-global-no-cwd.jsonl');
    await mkdir(join(home, '.codex', 'sessions'), { recursive: true });
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-global-no-cwd' } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-global-no-cwd.ts')]: { type: 'add', content: 'export const ambiguous = true;\n' }
      } } }
    ]);

    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'codex' })).resolves.toBeNull();
  });

  it('keeps explicit cwd-less Codex session files as an intentional user attribution signal', async () => {
    const sessionFile = join(dir, 'codex-explicit-no-cwd.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-explicit-no-cwd' } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-explicit-no-cwd.ts')]: { type: 'add', content: 'export const explicit = true;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.session_id).toBe('codex-explicit-no-cwd');
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/codex-explicit-no-cwd.ts']);
  });

  it('keeps Gemini auto-discovery bound to .project_root for cwd-less session rows', async () => {
    const home = join(dir, 'home');
    process.env.HOME = home;
    const projectTmpDir = join(home, '.gemini', 'tmp', 'project-hash');
    const sessionFile = join(projectTmpDir, 'chats', 'gemini-project-root-session.jsonl');
    await mkdir(join(projectTmpDir, 'chats'), { recursive: true });
    await writeFile(join(projectTmpDir, '.project_root'), `${dir}\n`);
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-project-root-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:01:00Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:10Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 12 }, toolCalls: [
        { id: 'tool-1', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'gemini-project-root.ts'), content: 'export const geminiProjectRoot = true;\n' } }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli' });

    expect(metrics?.session_id).toBe('gemini-project-root-session');
    expect(metrics?.tokens_used).toBe(12);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/gemini-project-root.ts']);
  });

  it('resolves relative session files from the invocation cwd when collecting from a subdirectory', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'codex-subdir-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-subdir-session', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'subdir.ts')]: { type: 'add', content: 'export const fromSubdir = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: join(dir, 'src'), source: 'codex', sessionFile: '../codex-subdir-session.jsonl' });

    expect(draft.source.session_id).toBe('codex-subdir-session');
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.metrics.lines_added).toBe(1);
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

  it('sniffs an explicit Codex session file even when Codex auto discovery is disabled', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = true;
    config.agents.codex.enabled = false;
    config.agents.cursor.enabled = false;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    const sessionFile = join(dir, 'codex-disabled-auto-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-disabled-auto-source', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-disabled-auto.ts')]: { type: 'add', content: 'export const fromDisabledCodex = true;\\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.source.session_id).toBe('codex-disabled-auto-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
  });

});
