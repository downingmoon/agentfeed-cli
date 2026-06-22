import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

interface RemotePreviewOutput {
  readonly draft_id?: string;
  readonly valid?: boolean;
  readonly preview?: {
    readonly title?: string;
    readonly summary?: string;
    readonly user_note?: string | null;
    readonly model?: string | null;
    readonly metrics_row?: string;
  };
  readonly warnings?: readonly string[];
  readonly next_actions?: readonly string[];
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

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-remote-preview-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('remote preview CLI command', () => {
  it('prints parseable remote preview JSON without human UX headings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote JSON preview';
    await writeDraft(dir, draft);
    let metadataCount = 0;
    let previewCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        handleCompatibleMetadata(req, res);
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs/preview') {
        previewCount += 1;
        expect(req.headers.authorization).toBe('Bearer af_live_preview_json');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            valid: true,
            preview: { title: 'Remote JSON preview', summary: 'Remote JSON summary', user_note: null, model: 'gpt-5.5', metrics_row: '1 file' },
            warnings: ['check privacy wording']
          }
        }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        cliPath,
        'preview',
        '--id',
        draft.id,
        '--remote',
        '--json'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_preview_json',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stderr).toBe('');
      const output: RemotePreviewOutput = JSON.parse(stdout);
      expect(output.draft_id).toBe(draft.id);
      expect(output.valid).toBe(true);
      expect(output.preview.title).toBe('Remote JSON preview');
      expect(output.preview.summary).toBe('Remote JSON summary');
      expect(output.preview.user_note).toBeNull();
      expect(output.preview.model).toBe('gpt-5.5');
      expect(output.preview.metrics_row).toBe('1 file');
      expect(output.warnings).toEqual(['check privacy wording']);
      expect(output.next_actions).toEqual([
        `agentfeed publish --id ${draft.id} --yes`,
        `agentfeed scan --id ${draft.id}`
      ]);
      expect(metadataCount).toBe(1);
      expect(previewCount).toBe(1);
      expect(stdout).not.toContain('AgentFeed remote preview');
      expect(stdout).not.toContain('\u001b[');
      expect(stdout).not.toContain('af_live_preview_json');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('guides scan and retry when remote preview JSON is invalid', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote invalid preview';
    await writeDraft(dir, draft);
    const server = createServer(async (req, res) => {
      if (handleCompatibleMetadata(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs/preview') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            valid: false,
            preview: { title: 'Remote invalid preview', summary: 'Remote invalid summary', user_note: null, model: null, metrics_row: '0 files' },
            warnings: ['summary is too short']
          }
        }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        cliPath,
        'preview',
        '--id',
        draft.id,
        '--remote',
        '--json'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_preview_invalid_json',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stderr).toBe('');
      const output: RemotePreviewOutput = JSON.parse(stdout);
      expect(output.draft_id).toBe(draft.id);
      expect(output.valid).toBe(false);
      expect(output.warnings).toEqual(['summary is too short']);
      expect(output.next_actions).toEqual([
        `agentfeed scan --id ${draft.id}`,
        `agentfeed preview --id ${draft.id} --remote`
      ]);
      expect(stdout).not.toContain('AgentFeed remote preview');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

});
