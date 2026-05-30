import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { readCollectionState } from '../src/config/collection-state.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-cli-home-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  await initProject({ cwd: dir, noGitCheck: false });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('collect CLI command', () => {
  it('rejects unsupported source values before creating a draft', async () => {
    let error: unknown = null;
    try {
      execFileSync(process.execPath, [
        cliPath,
        'collect',
        '--source',
        'banana-agent',
        '--no-save-cursor'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, HOME: home },
        stdio: 'pipe'
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeTruthy();
    const stderr = String((error as { stderr?: Buffer | string }).stderr ?? '');
    expect(stderr).toMatch(/Unsupported agent source/i);
  });

  it('persists collection cursor when rendering JSON output', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--since',
      '2026-05-20T01:00:00Z',
      '--until',
      '2026-05-20T02:00:00Z'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = JSON.parse(stdout);

    expect(draft.source.collection_window.until).toBe('2026-05-20T02:00:00.000Z');
    await expect(readCollectionState(dir)).resolves.toEqual({ last_collected_at: '2026-05-20T02:00:00.000Z' });
  });

  it('auto-slices default collect windows after an idle gap', async () => {
    const sessionFile = join(home, 'codex-idle-gap-session.jsonl');
    await writeFile(sessionFile, [
      JSON.stringify({ timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-cli-idle-gap', cwd: dir } }),
      JSON.stringify({ timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } }),
      JSON.stringify({ timestamp: '2026-05-20T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'old-codex.ts')]: { type: 'add', content: 'export const oldCodex = true;\n' }
      } } }),
      JSON.stringify({ timestamp: '2026-05-20T01:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } }),
      JSON.stringify({ timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'new-codex.ts')]: { type: 'add', content: 'export const newCodex = true;\n' }
      } } })
    ].join('\n') + '\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--source',
      'codex',
      '--session-file',
      sessionFile,
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = JSON.parse(stdout);

    expect(draft.source.collection_window.since).toBe('2026-05-20T01:01:00.000Z');
    expect(draft.source.collection_window.until).toBeTruthy();
    expect(draft.source.collection_window_reason).toBe('idle_gap');
    expect(draft.worklog.metrics.tokens_used).toBe(65);
    expect(draft.worklog.metrics.files_changed).toBe(1);
    expect(draft.worklog.metrics.lines_added).toBe(1);
  });

  it('does not upload from repo-local auto_upload unless --upload is explicit', async () => {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.auto_upload = true;
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "auto-upload-disabled";\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--all',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = JSON.parse(stdout);
    expect(draft.upload.uploaded).toBe(false);
    expect(draft.id).toMatch(/^draft_/);
  });
});
