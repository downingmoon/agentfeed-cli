import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { readCollectionState } from '../src/config/collection-state.js';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from '../src/api/client.js';
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
      token: {
        id: 'token_collect_test',
        name: 'CLI collect test token',
        expires_at: '2026-06-15T00:00:00.000Z',
        expiring_soon: false
      }
    }
  }));
  return true;
}

function handleUploadPreflight(req: IncomingMessage, res: ServerResponse): boolean {
  return handleCompatibleMetadata(req, res) || handleHealthyIngestionToken(req, res);
}

async function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function installFailingBrowserOpener(binDir: string): Promise<void> {
  const script = '#!/usr/bin/env sh\nexit 1\n';
  await mkdir(binDir, { recursive: true });
  await Promise.all(['open', 'xdg-open', 'wslview'].map(async (name) => {
    const path = join(binDir, name);
    await writeFile(path, script);
    await chmod(path, 0o755);
  }));
}

describe('collect CLI command', () => {
  it('prints polished human-readable explain output with draft summary and next-step sections', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "human-explain";\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'collect',
      '--explain',
      '--all',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed draft');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('ID:');
    expect(stdout).toContain('Title:');
    expect(stdout).toContain('Signals');
    expect(stdout).toContain('Agent:');
    expect(stdout).toContain('Metrics:');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Preview:');
    expect(stdout).toContain('agentfeed preview --id');
    expect(stdout).toContain('Upload:');
    expect(stdout).toContain('agentfeed publish --id');
  });

  it('prints subcommand help without collecting or updating local state', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'collect', '--help'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('Usage: agentfeed collect');
    expect(stdout).toContain('--source <source>');
    expect(stdout).toContain('--session-file <path>');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed login --token-stdin');
    expect(stderr).toBe('');
    await expect(readdir(join(dir, '.agentfeed', 'drafts'))).resolves.toEqual([]);
    await expect(readFile(join(dir, '.agentfeed', 'state.json'), 'utf8')).rejects.toThrow();
  });

  it('rejects unsupported source values before creating a draft', async () => {
    let error: unknown = null;
    try {
      execFileSync(process.execPath, [
        cliPath,
        'collect',
        '--source',
        'gemni-cli',
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
    expect(stderr).toContain('Unsupported agent source: gemni-cli');
    expect(stderr).toContain('Supported sources: claude-code, codex, cursor, gemini-cli, other');
    expect(stderr).toContain('Did you mean: --source gemini-cli');
    expect(stderr).toContain('Run: agentfeed collect --source gemini-cli --explain');
    expect(stderr).toContain('Run: agentfeed collect --help');
  });


  it('ignores a malformed collection cursor instead of blocking collection', async () => {
    await writeFile(join(dir, '.agentfeed', 'state.json'), '{not-json');
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "cursor-recovered";\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--until',
      '2026-05-20T02:00:00Z',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = JSON.parse(stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.source.collection_window.since).toBeNull();
    expect(draft.source.collection_window.until).toBe('2026-05-20T02:00:00.000Z');
  });

  it('fails malformed project config with actionable recovery guidance', async () => {
    await writeFile(join(dir, '.agentfeed', 'config.json'), '{not-json');

    let failure: { stderr?: string; stdout?: string } | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'collect', '--json'], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, HOME: home }
      });
    } catch (error) {
      failure = error as { stderr?: string; stdout?: string };
    }

    expect(failure?.stderr).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(failure?.stderr).toContain('Re-run agentfeed init or restore the file from backup');
    expect(failure?.stderr).not.toContain('Unexpected token');
    expect(failure?.stdout ?? '').toBe('');
  });

  it('fails malformed project config shape before creating a draft', async () => {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = 'not-an-array';
    await writeFile(configPath, JSON.stringify(config, null, 2));

    let failure: { stderr?: string; stdout?: string } | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'collect', '--json'], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, HOME: home }
      });
    } catch (error) {
      failure = error as { stderr?: string; stdout?: string };
    }

    expect(failure?.stderr).toContain('AgentFeed config is invalid');
    expect(failure?.stderr).toContain('project.tags must be an array of strings');
    expect(failure?.stderr).toContain('Re-run agentfeed init or restore the file from backup');
    expect(failure?.stderr).not.toContain('TypeError');
    expect(failure?.stdout ?? '').toBe('');
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

    expect(draft.id).toMatch(/^draft_/);
    expect(draft.worklog).toBeTruthy();
    expect(draft.source).toBeTruthy();
    expect(draft.draft).toBeUndefined();
    expect(draft.draft_id).toBeUndefined();
    expect(draft.source.collection_window.until).toBe('2026-05-20T02:00:00.000Z');
    await expect(readCollectionState(dir)).resolves.toEqual({ last_collected_at: '2026-05-20T02:00:00.000Z' });
  });

  it('prints parseable collect JSON without human UX headings or ANSI styling', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-clean";\n');

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
    expect(draft.id).toMatch(/^draft_/);
    expect(stdout).not.toContain('\u001b[');
    expect(stdout).not.toMatch(/(^|\n)(AgentFeed draft|Summary|Signals|Collection|Next|ID:|Preview:|Upload:)/);
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

  it('uploads before printing JSON when --json and --upload are combined', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload";\n');
    let requestCount = 0;
    let uploadedPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        requestCount += 1;
        uploadedPayload = await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'worklog_collect_json_upload',
            status: 'needs_review',
            visibility: 'private',
            review_url: 'http://localhost:3001/worklogs/worklog_collect_json_upload/review',
            created_at: '2026-05-31T00:00:00Z'
          }
        }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
      const { stdout } = await execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--upload',
        '--all',
        '--no-save-cursor'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_collect_json_upload',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const draft = JSON.parse(stdout);
      expect(requestCount).toBe(1);
      expect(uploadedPayload?.worklog).toBeTruthy();
      expect(draft.id).toMatch(/^draft_/);
      expect(draft.worklog).toBeTruthy();
      expect(draft.draft).toBeUndefined();
      expect(draft.draft_id).toBeUndefined();
      expect(draft.upload).toMatchObject({
        uploaded: true,
        worklog_id: 'worklog_collect_json_upload',
        review_url: 'http://localhost:3001/worklogs/worklog_collect_json_upload/review'
      });

      const savedDraft = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
      expect(draft.upload).toEqual(savedDraft.upload);
      expect(savedDraft.upload).toMatchObject({
        uploaded: true,
        worklog_id: 'worklog_collect_json_upload',
        review_url: 'http://localhost:3001/worklogs/worklog_collect_json_upload/review',
        review_base_url: 'http://localhost:3001',
        uploaded_at: '2026-05-31T00:00:00Z'
      });
      expect(draft.upload.payload_hash).toBe(draftUploadPayloadHash(draft));
      expect(draft.upload.credential_binding_hash).toBe(draftUploadCredentialBindingHash({
        ingestion_token: 'af_live_collect_json_upload',
        api_base_url: `http://127.0.0.1:${address.port}/v1`,
        created_at: 'test'
      }));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('refuses collect JSON upload before ingest when the ingestion token preflight fails', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-invalid-token";\n');
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleCompatibleMetadata(req, res)) return;
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token' } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
      await expect(execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--upload',
        '--all',
        '--no-save-cursor'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_collect_invalid_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('Ingestion token check failed')
      });
      expect(tokenStatusCount).toBe(1);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('keeps the collection cursor unchanged when collect JSON upload preflight fails', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-cursor-invalid-token";\n');
    const server = createServer(async (req, res) => {
      if (handleCompatibleMetadata(req, res)) return;
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token' } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
      await expect(execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--upload',
        '--since',
        '2026-05-20T01:00:00Z',
        '--until',
        '2026-05-20T02:00:00Z'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_collect_cursor_invalid_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('Ingestion token check failed')
      });
      await expect(readCollectionState(dir)).resolves.toEqual({});
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('keeps the collection cursor unchanged when collect JSON ingest upload fails', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-cursor-ingest-fails";\n');
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await readRequestBody(req);
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'boom', details: {} } }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
      await expect(execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--upload',
        '--since',
        '2026-05-20T01:00:00Z',
        '--until',
        '2026-05-20T02:00:00Z'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_collect_cursor_upload_fails',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('Server error. Local draft was kept.')
      });
      expect(ingestRequestCount).toBeGreaterThan(0);
      await expect(readCollectionState(dir)).resolves.toEqual({});
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reports requested collect JSON open-review handoff failures in the draft upload payload', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-open";\n');
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'worklog_collect_json_handoff',
            status: 'needs_review',
            visibility: 'private',
            review_url: 'http://localhost:3001/worklogs/worklog_collect_json_handoff/review',
            created_at: '2026-06-01T00:00:00Z'
          }
        }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-collect-open-fail-bin-'));
    await installFailingBrowserOpener(fakeBin);
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        cliPath,
        'collect',
        '--json',
        '--upload',
        '--open-review',
        '--all',
        '--no-save-cursor'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_collect_json_upload',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const draft = JSON.parse(stdout);
      expect(stderr).toBe('');
      expect(draft.upload.review_url).toBe('http://localhost:3001/worklogs/worklog_collect_json_handoff/review');
      expect(draft.upload.handoff.browser).toMatchObject({ requested: true, ok: false });
      expect(draft.upload.handoff.browser.warning).toContain('could not be opened');
      expect(draft.upload.handoff.clipboard).toMatchObject({ requested: false, ok: null });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
