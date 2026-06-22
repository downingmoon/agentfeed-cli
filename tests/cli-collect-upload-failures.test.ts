import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { readCollectionState } from '../src/config/collection-state.js';
import { ensureCliBuilt } from './build-cli.js';
import {
  cliFailureFrom,
  drainRequestBody,
  handleCompatibleMetadata,
  handleUploadPreflight,
  parseCliErrorOutput,
  type CliFailure
} from './cli-collect-upload-failure-helpers.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-upload-failure-'));
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

describe('collect JSON upload failure handling', () => {
  it('refuses collect JSON upload before ingest when the ingestion token preflight fails', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-invalid-token";\n');
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleCompatibleMetadata(req, res)) return;
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await drainRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
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
      let failure: CliFailure | undefined;
      try {
        await execFileAsync(process.execPath, [
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
        });
      } catch (error) {
        failure = cliFailureFrom(error);
      }
      const output = parseCliErrorOutput(failure?.stdout);
      expect(output.error.message).toContain('Ingestion token check failed');
      expect(output.next_actions).toEqual([
        'unset AGENTFEED_TOKEN',
        'agentfeed status',
        'agentfeed login',
        'agentfeed rotate',
        'agentfeed collect --json --upload'
      ]);
      expect(failure?.stderr ?? '').toBe('');
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
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        await drainRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
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
      let failure: CliFailure | undefined;
      try {
        await execFileAsync(process.execPath, [
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
        });
      } catch (error) {
        failure = cliFailureFrom(error);
      }
      const output = parseCliErrorOutput(failure?.stdout);
      expect(output.error.message).toContain('Ingestion token check failed');
      expect(failure?.stderr ?? '').toBe('');
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
        await drainRequestBody(req);
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'boom', details: {} } }));
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
      let failure: CliFailure | undefined;
      try {
        await execFileAsync(process.execPath, [
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
        });
      } catch (error) {
        failure = cliFailureFrom(error);
      }
      const output = parseCliErrorOutput(failure?.stdout);
      expect(output.error.message).toContain('Server error. Local draft was kept.');
      expect(failure?.stderr ?? '').toBe('');
      expect(ingestRequestCount).toBeGreaterThan(0);
      await expect(readCollectionState(dir)).resolves.toEqual({});
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
