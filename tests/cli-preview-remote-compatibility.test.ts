import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
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

interface JsonErrorOutput {
  readonly error: {
    readonly message: string;
    readonly details: readonly string[];
  };
  readonly next_actions: readonly string[];
}

interface CliFailure extends Error {
  readonly stdout?: unknown;
  readonly stderr?: unknown;
}

function isCliFailure(error: unknown): error is CliFailure {
  return error instanceof Error;
}

function textOutput(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return '';
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-remote-preview-compat-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('remote preview API compatibility', () => {
  it('refuses remote preview before posting when API metadata is incompatible', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote preview incompatible API';
    await writeDraft(dir, draft);
    let metadataCount = 0;
    let previewCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'unexpected-api' } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs/preview') {
        previewCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { valid: true, preview: {}, warnings: [] } }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      let failure: CliFailure | undefined;
      try {
        await execFileAsync(process.execPath, [
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
            AGENTFEED_TOKEN: 'af_live_preview_incompatible',
            AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
          }
        });
      } catch (error) {
        if (isCliFailure(error)) {
          failure = error;
        } else {
          throw error;
        }
      }

      const output: JsonErrorOutput = JSON.parse(textOutput(failure?.stdout) || '{}');
      expect(textOutput(failure?.stderr)).toBe('');
      expect(output.error.message).toContain('API compatibility check failed');
      expect(output.error.message).toContain('before uploading drafts');
      expect(output.next_actions).toEqual(['agentfeed doctor', 'agentfeed status']);
      expect(textOutput(failure?.stdout)).not.toContain('af_live_preview_incompatible');
      expect(metadataCount).toBe(1);
      expect(previewCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
