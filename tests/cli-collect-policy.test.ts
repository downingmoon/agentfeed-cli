import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-policy-'));
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('expected JSON object');
  return value;
}

function requiredRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`expected object: ${description}`);
  return value;
}

describe('collect policy handling', () => {
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

    const draft = parseJsonObject(stdout);
    const source = requiredRecord(draft.source, 'source');
    const collectionWindow = requiredRecord(source.collection_window, 'collection_window');
    const worklog = requiredRecord(draft.worklog, 'worklog');
    const metrics = requiredRecord(worklog.metrics, 'metrics');
    expect(collectionWindow.since).toBe('2026-05-20T01:01:00.000Z');
    expect(collectionWindow.until).toBeTruthy();
    expect(source.collection_window_reason).toBe('idle_gap');
    expect(metrics.tokens_used).toBe(65);
    expect(metrics.files_changed).toBe(1);
    expect(metrics.lines_added).toBe(1);
  });

  it('does not upload from repo-local auto_upload unless --upload is explicit', async () => {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = parseJsonObject(await readFile(configPath, 'utf8'));
    const collection = requiredRecord(config.collection, 'collection');
    collection.auto_upload = true;
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "auto-upload-disabled";\n');

    const stdout = execFileSync(process.execPath, [cliPath, 'collect', '--json', '--all', '--no-save-cursor'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = parseJsonObject(stdout);
    const upload = requiredRecord(draft.upload, 'upload');
    expect(upload.uploaded).toBe(false);
    expect(draft.id).toMatch(/^draft_/);
  });
});
