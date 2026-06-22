import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { readCollectionState } from '../src/config/collection-state.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from '../src/api/client.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

function cachedUploadBindingForEnv(options: { token?: string; apiBaseUrl?: string } = {}) {
  const credentials = {
    ingestion_token: options.token ?? 'af_live_test_token',
    api_base_url: options.apiBaseUrl ?? 'https://api.agentfeed.dev/v1',
    created_at: 'now',
  };
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: null,
    user_id: null,
  };
}

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

async function installFakeClipboard(binDir: string): Promise<string> {
  const logPath = join(binDir, 'clipboard.log');
  const script = '#!/usr/bin/env sh\ncat >> "$AGENTFEED_TEST_CLIPBOARD_LOG"\nexit 0\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['pbcopy', 'xclip', 'wl-copy', 'xsel', 'clip.exe'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
  return logPath;
}

async function installFailingReviewUrlHandoff(binDir: string): Promise<void> {
  const script = '#!/usr/bin/env sh\nexit 1\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['open', 'xdg-open', 'wslview', 'pbcopy', 'xclip', 'wl-copy', 'xsel', 'clip.exe'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
}


function compatibleMetadataPayload() {
  return {
    data: {
      service: 'agentfeed-api',
      api_version: 'v1',
      backend_version: '0.1.0',
      contract_version: '2026-06-03',
      review_base_url: 'http://localhost:3001',
      supported_clients: {
        cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
      }
    }
  };
}

function handleCompatibleMetadata(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/metadata') return false;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(compatibleMetadataPayload()));
  return true;
}

function handleHealthyIngestionToken(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/ingest/status') return false;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    data: {
      ok: true,
      user: {
        id: 'user_test',
        username: 'downingmoon',
        display_name: 'Downing Moon',
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
      },
      token: {
        id: 'token_test',
        name: 'CLI test token',
        created_at: '2026-06-01T00:00:00.000Z',
        last_used_at: null,
        expires_at: '2026-06-15T00:00:00.000Z',
        expires_in_seconds: 604800,
        expiring_soon: false
      }
    }
  }));
  return true;
}

function handleUploadPreflight(req: IncomingMessage, res: ServerResponse): boolean {
  return handleCompatibleMetadata(req, res) || handleHealthyIngestionToken(req, res);
}

async function startUploadPreflightServer(): Promise<{ apiBaseUrl: string; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    if (handleUploadPreflight(req, res)) return;
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return {
    apiBaseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}

async function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function writeCodexShareSession(sessionId: string, model: string, exportName: string): Promise<string> {
  const sessionFile = join(dir, '.agentfeed', `${sessionId}.jsonl`);
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-31T00:00:00Z', type: 'session_meta', payload: { id: sessionId, cwd: dir, model } }),
    JSON.stringify({ timestamp: '2026-05-31T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 31 } } } }),
    JSON.stringify({ timestamp: '2026-05-31T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: `--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const ${exportName} = true;\n` }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(dir, 'src', 'api.ts'), `export const ok = true;\nexport const ${exportName} = true;\n`);
  return sessionFile;
}

describe('share CLI command', () => {
  it('prints structured upload completion for human-readable share uploads', async () => {
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_share_human_upload',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_human_upload/review',
          created_at: '2026-06-06T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = await writeCodexShareSession('share-human-upload', 'gpt-share-human', 'shareHumanUpload');
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--yes',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard',
        '--no-open-review'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_share_human',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          AGENTFEED_CI: '1'
        }
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('AgentFeed upload complete');
      expect(stdout).toContain('Worklog uploaded.');
      expect(stdout).toContain('Summary');
      expect(stdout).toMatch(/Draft: draft_/);
      expect(stdout).toContain('Status: needs_review');
      expect(stdout).toContain('Review URL:');
      expect(stdout).toContain('http://localhost:3001/worklogs/worklog_share_human_upload/review');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('Recommended order:');
      expect(stdout).toMatch(/  1\. agentfeed open --id draft_/);
      expect(stdout).toMatch(/  2\. agentfeed preview --id draft_/);
      expect(stdout).not.toContain('Handoff');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('dry-run skips configured project commands even when command collection is enabled', async () => {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const commandPath = join(dir, '.agentfeed', 'dry-run-command.js');
    const markerPath = join(dir, '.agentfeed', 'dry-run-command-ran');
    const config = JSON.parse(await readFile(configPath, 'utf8')) as {
      collection: { run_tests_on_collect: boolean };
      commands: { test: string | null; build: string | null };
    };
    config.collection.run_tests_on_collect = true;
    config.commands.test = `${process.execPath} .agentfeed/dry-run-command.js`;
    config.commands.build = null;
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(commandPath, 'require("node:fs").writeFileSync(".agentfeed/dry-run-command-ran", "yes");\n');
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\nexport const dryRun = true;\n');

    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      'share',
      '--dry-run',
      '--all',
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
      }
    });

    expect(stdout).toContain('Dry run complete');
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
  });

  it('opens the review URL after publish when project config enables it', async () => {
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
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

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          CI: '0',
          GITHUB_ACTIONS: '0',
          AGENTFEED_CI: '0'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      expect(publish.stdout).toContain('Handoff');
      expect(publish.stdout).toContain('Review URL opened in browser.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_auto_open/review\n');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not auto-open review URLs in CI unless explicitly requested', async () => {
    const preflight = await startUploadPreflightServer();
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_ci_no_open',
      review_url: 'http://localhost:3001/worklogs/worklog_ci_no_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...cachedUploadBindingForEnv({ apiBaseUrl: preflight.apiBaseUrl })
    };
    await writeDraft(dir, draft);
    const fakeBin = join(dir, '.agentfeed', 'fake-ci-bin');
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await preflight.close();
    }
  });

  it('lets users explicitly suppress configured review auto-open during publish', async () => {
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_no_open_flag',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_no_open_flag/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'No open flag';
      await writeDraft(dir, draft);
      const fakeBin = join(dir, '.agentfeed', 'fake-no-open-bin');
      const browserLog = await installFakeBrowserOpener(fakeBin);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes', '--no-open-review'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          CI: '0',
          GITHUB_ACTIONS: '0',
          AGENTFEED_CI: '0'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('prints visible warnings when publish review URL handoff fails in human output', async () => {
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_publish_failed_handoff',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_failed_handoff/review',
          created_at: '2026-06-01T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-human-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);
    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Publish handoff warning';
      draft.worklog.summary = 'Warn when requested handoff fails';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes', '--open-review'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(publish.stdout).toContain('Warning: Review URL was not copied to clipboard.');
      expect(publish.stdout).toContain('Warning: Review URL could not be opened automatically.');
      expect(publish.stdout).toContain('Manual review URL:');
      expect(publish.stdout).toContain('  http://localhost:3001/worklogs/worklog_publish_failed_handoff/review');
      expect(publish.stdout).not.toContain('upload.review_url');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
