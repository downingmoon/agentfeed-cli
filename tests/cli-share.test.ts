import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage } from 'node:http';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-share-'));
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

async function installFakeBrowserOpener(binDir: string): Promise<string> {
  const logPath = join(binDir, 'browser-open.log');
  const script = '#!/usr/bin/env sh\necho "$1" >> "$AGENTFEED_TEST_BROWSER_LOG"\nexit 0\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['open', 'xdg-open', 'wslview'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
  return logPath;
}

async function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

describe('share CLI command', () => {
  it('includes the collected draft in uploaded JSON output for smoke verification', async () => {
    let ingestPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestPayload = await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_share_json',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json/review',
          created_at: '2026-05-30T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = join(dir, '.agentfeed', 'codex-share.jsonl');
      await writeFile(sessionFile, [
        JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'share-json-session', cwd: dir, model: 'gpt-share-json' } }),
        JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 42 } } } }),
        JSON.stringify({ timestamp: '2026-05-30T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
          [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = false;\n+export const shared = true;\n' }
        } } })
      ].join('\n') + '\n');
      await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\nexport const shared = true;\n');

      const { stdout } = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--note',
        'Smoke author note',
        '--all',
        '--no-clipboard'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as {
        draft?: { worklog?: { user_note?: string | null; summary?: string; model?: string | null } };
        upload?: { id?: string };
      };
      expect(output.upload?.id).toBe('worklog_share_json');
      expect(output.draft?.worklog?.user_note).toBe('Smoke author note');
      expect(output.draft?.worklog?.summary).not.toContain('Smoke author note');
      expect(output.draft?.worklog?.model).toBe('gpt-share-json');
      expect((ingestPayload?.worklog as { user_note?: string } | undefined)?.user_note).toBe('Smoke author note');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('redacts reused draft secrets before JSON output and upload', async () => {
    const secret = 'sk-123456789012345678901234';
    let ingestPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestPayload = await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_redacted_reuse',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_redacted_reuse/review',
          created_at: '2026-05-30T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = join(dir, '.agentfeed', 'codex-reuse.jsonl');
      await writeFile(sessionFile, [
        JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'reuse-session', cwd: dir, model: 'gpt-reuse' } }),
        JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
          [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = false;\n' }
        } } })
      ].join('\n') + '\n');
      await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\n');

      const collect = await execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--since',
        '2026-05-30T00:00:00.000Z',
        '--until',
        '2026-05-30T01:00:00.000Z',
        '--no-save-cursor'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, HOME: home }
      });
      const draftId = (JSON.parse(collect.stdout) as { id: string }).id;
      const draftPath = join(dir, '.agentfeed', 'drafts', `${draftId}.json`);
      const draft = JSON.parse(await readFile(draftPath, 'utf8')) as {
        worklog: { summary: string; model: string | null; metrics: { agent_modes?: string[] | null } };
      };
      draft.worklog.summary = `manual ${secret}`;
      draft.worklog.model = `model-${secret}`;
      draft.worklog.metrics.agent_modes = [`mode-${secret}`];
      await writeFile(draftPath, JSON.stringify(draft, null, 2));

      const { stdout } = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--since',
        '2026-05-30T00:00:00.000Z',
        '--until',
        '2026-05-30T01:00:00.000Z',
        '--no-clipboard'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stdout).not.toContain(secret);
      expect(JSON.stringify(ingestPayload)).not.toContain(secret);
      const savedDraft = await readFile(draftPath, 'utf8');
      expect(savedDraft).not.toContain(secret);
      const output = JSON.parse(stdout) as {
        reused_existing_draft?: boolean;
        draft?: { worklog?: { summary?: string; model?: string | null; metrics?: { agent_modes?: string[] | null } } };
      };
      expect(output.reused_existing_draft).toBe(true);
      expect(output.draft?.worklog?.summary).toContain('[REDACTED_SECRET]');
      expect(output.draft?.worklog?.model).toBe('model-[REDACTED_SECRET]');
      expect(output.draft?.worklog?.metrics?.agent_modes).toEqual(['mode-[REDACTED_SECRET]']);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('opens the review URL after publish when project config enables it', async () => {
    const server = createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_auto_open',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_auto_open/review',
          created_at: '2026-05-30T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = join(dir, '.agentfeed', 'codex-open-review.jsonl');
      await writeFile(sessionFile, [
        JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'open-review-session', cwd: dir, model: 'gpt-open-review' } }),
        JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
          [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = true;\n+export const autoOpen = true;\n' }
        } } })
      ].join('\n') + '\n');
      await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\nexport const autoOpen = true;\n');

      const collect = await execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all'
      ], { cwd: dir, encoding: 'utf8', env: { ...process.env, HOME: home } });
      const draft = JSON.parse(collect.stdout) as { id: string };
      const fakeBin = join(dir, '.agentfeed', 'fake-bin');
      const browserLog = await installFakeBrowserOpener(fakeBin);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_auto_open/review\n');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
