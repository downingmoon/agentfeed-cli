import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
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
      user: {
        id: 'user_collect_test',
        username: 'downingmoon',
        display_name: 'Downing Moon',
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4'
      },
      token: {
        id: 'token_collect_test',
        name: 'CLI collect test token',
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
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }));
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
      expect(draft.next_actions).toEqual([
        `agentfeed open --id ${draft.id}`,
        `agentfeed preview --id ${draft.id}`
      ]);

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
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }));
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
