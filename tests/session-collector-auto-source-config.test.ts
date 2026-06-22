import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';

let dir: string;
const oldHome = process.env.HOME;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-auto-source-'));
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

describe('agent session auto source config', () => {
  it('aggregates enabled agent sessions instead of stopping at the first auto source', async () => {
    const home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
    process.env.HOME = home;
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = true;
    config.agents.codex.enabled = true;
    config.agents.cursor.enabled = false;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });

    const projectDirName = dir.replace(/\//g, '-');
    const claudeSessionFile = join(home, '.claude', 'projects', projectDirName, 'claude-auto-session.jsonl');
    await mkdir(join(home, '.claude', 'projects', projectDirName), { recursive: true });
    await writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-auto-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'claude-auto.ts'), content: 'export const claudeAuto = true;\n' } }
      ] } }
    ]);

    const codexSessionFile = join(home, '.codex', 'sessions', 'codex-auto-session.jsonl');
    await mkdir(join(home, '.codex', 'sessions'), { recursive: true });
    await writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T01:01:00Z', type: 'session_meta', payload: { id: 'codex-auto-session', cwd: dir, model: 'gpt-5.5' } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 240 } } } },
      { timestamp: '2026-05-20T01:03:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-auto.ts')]: { type: 'add', content: 'export const codexAuto = true;\nexport const codexMore = true;\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.worklog.model).toBe('gpt-5.5');
    expect(draft.worklog.metrics.models_used).toEqual(['claude-sonnet', 'gpt-5.5']);
    expect(draft.worklog.metrics.tokens_used).toBe(255);
    expect(draft.worklog.metrics.files_changed).toBe(2);
    expect(draft.worklog.metrics.lines_added).toBe(3);
    expect(draft.worklog.metrics.agent_metrics).toEqual([
      expect.objectContaining({ agent: 'claude_code', model: 'claude-sonnet', session_id: 'claude-auto-session', tokens_used: 15, files_changed: 1, lines_added: 1 }),
      expect.objectContaining({ agent: 'codex', model: 'gpt-5.5', session_id: 'codex-auto-session', tokens_used: 240, files_changed: 1, lines_added: 2 })
    ]);
    expect(draft.worklog.metrics.collection_sources).toEqual([
      { type: 'agent_session', name: 'claude_code', quality: 'high' },
      { type: 'agent_session', name: 'codex', quality: 'high' }
    ]);
  });

  it('respects enabled agent config when auto-selecting session sources', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = false;
    config.agents.codex.enabled = true;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    const sessionFile = join(dir, '.agentfeed', 'mixed-source-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'disabled-claude-source', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'claude-disabled.ts'), content: 'export const claude = true;\\n' } }
      ] } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'session_meta', payload: { id: 'enabled-codex-source', cwd: dir } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'codex-enabled.ts')]: { type: 'add', content: 'export const codex = true;\\n' }
      } } }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.source.session_id).toBe('enabled-codex-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.changed_areas).toContain('Application code');
  });

  it('allows explicit source to override disabled agent config', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.agents.claude_code.enabled = false;
    config.agents.codex.enabled = true;
    config.agents.gemini_cli.enabled = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    const sessionFile = join(dir, '.agentfeed', 'claude-explicit-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'explicit-claude-source', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'claude-explicit.ts'), content: 'export const claude = true;\\n' } }
      ] } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(draft.worklog.agent).toBe('claude_code');
    expect(draft.source.agent).toBe('claude_code');
    expect(draft.source.session_id).toBe('explicit-claude-source');
    expect(draft.worklog.metrics.files_changed).toBe(1);
  });

  it('auto-detects Gemini CLI when collect receives a Gemini session file without an explicit source', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
    const sessionFile = join(dir, 'gemini-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-auto-source', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:00:01Z', kind: 'main' },
      { id: 'g1', timestamp: '2026-05-20T00:00:01Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 10 }, toolCalls: [
        { id: 'tool-1', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'gemini.ts'), content: 'export const gemini = true;\\n' } }
      ] }
    ]);

    const draft = await collectDraft({ cwd: dir, sessionFile });

    expect(draft.worklog.agent).toBe('gemini_cli');
    expect(draft.source.agent).toBe('gemini_cli');
    expect(draft.source.session_id).toBe('gemini-auto-source');
    expect(draft.worklog.metrics.tool_calls).toBe(1);
    expect(draft.worklog.metrics.tokens_used).toBe(10);
  });

});
