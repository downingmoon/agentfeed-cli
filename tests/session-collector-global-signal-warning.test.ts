import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { collectDraftWithStatus } from '../src/draft/create.js';

let dir: string;
const oldHome = process.env.HOME;

async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentfeed-global-signal-warning-'));
  dir = join(root, 'project');
  await mkdir(dir, { recursive: true });
  process.env.HOME = join(root, 'home');
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await writeFile(join(dir, 'README.md'), '# test\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  await initProject({ cwd: dir, noGitCheck: false });
});

afterEach(async () => {
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  await rm(join(dir, '..'), { recursive: true, force: true });
});

describe('global agent signal warnings', () => {
  it('warns when Codex is detected globally but no session matches the project root', async () => {
    const sessionFile = join(process.env.HOME ?? '', '.codex', 'sessions', 'wrong-project.jsonl');
    await mkdir(join(sessionFile, '..'), { recursive: true });
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'wrong-project', cwd: join(dir, '..', 'workspace-root') } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: { total_tokens: 42 } } }
    ]);

    const result = await collectDraftWithStatus({ cwd: dir, source: 'codex', force: true });

    expect(result.draft.worklog.metrics.collection_sources).toBeNull();
    expect(result.warnings).toContain('Codex CLI signals were detected, but no Codex session matched this project root. If the agent ran from a parent or workspace directory, run agentfeed from that initialized root or pass a session file that belongs to this project.');
  });

  it('warns when Antigravity transcripts exist but none match the project root', async () => {
    const conversationDb = join(process.env.HOME ?? '', '.gemini', 'antigravity-cli', 'conversations', 'conversation.db');
    const transcriptFile = join(process.env.HOME ?? '', '.gemini', 'antigravity-cli', 'brain', 'wrong-project', '.system_generated', 'logs', 'transcript.jsonl');
    await mkdir(join(conversationDb, '..'), { recursive: true });
    await mkdir(join(transcriptFile, '..'), { recursive: true });
    await writeFile(conversationDb, 'sqlite placeholder');
    await writeJsonl(transcriptFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'USER_INPUT', content: 'not this project' },
      { timestamp: '2026-05-20T00:00:01Z', type: 'CODE_ACTION', content: 'Modified file /tmp/wrong-project/src/app.ts' }
    ]);

    const result = await collectDraftWithStatus({ cwd: dir, source: 'gemini_cli', force: true });

    expect(result.draft.worklog.metrics.collection_sources).toBeNull();
    expect(result.warnings).toContain('Gemini/Antigravity CLI signals were detected, but no Gemini/Antigravity session matched this project root. If the agent ran from a parent or workspace directory, run agentfeed from that initialized root or pass a session file that belongs to this project. Antigravity transcript.jsonl files were detected, but none matched this project root. Antigravity conversation databases were also detected, but AgentFeed currently reads Gemini JSONL chats or Antigravity transcript.jsonl files, not Antigravity protobuf SQLite databases.');
  });

  it('warns when Antigravity conversation databases exist but no JSONL transcript matches the project root', async () => {
    const conversationDb = join(process.env.HOME ?? '', '.gemini', 'antigravity-cli', 'conversations', 'conversation.db');
    await mkdir(join(conversationDb, '..'), { recursive: true });
    await writeFile(conversationDb, 'sqlite placeholder');

    const result = await collectDraftWithStatus({ cwd: dir, source: 'gemini_cli', force: true });

    expect(result.draft.worklog.metrics.collection_sources).toBeNull();
    expect(result.warnings).toContain('Gemini/Antigravity CLI signals were detected, but no Gemini/Antigravity session matched this project root. If the agent ran from a parent or workspace directory, run agentfeed from that initialized root or pass a session file that belongs to this project. Antigravity conversation databases were detected, but AgentFeed currently reads Gemini JSONL chats or Antigravity transcript.jsonl files, not Antigravity protobuf SQLite databases.');
  });
});
