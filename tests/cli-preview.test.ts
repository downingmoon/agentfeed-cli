import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

function runPreviewFailure(args: string[]): { stdout: string; stderr: string } {
  try {
    execFileSync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: undefined,
        AGENTFEED_ALLOW_INSECURE_API: undefined
      }
    });
  } catch (error) {
    const failure = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    return {
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? '')
    };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-preview-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('preview CLI command', () => {
  it('guides project initialization before latest preview outside a project', async () => {
    await rm(join(dir, '.agentfeed'), { recursive: true, force: true });

    const { stdout, stderr } = runPreviewFailure(['preview', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('AgentFeed project is not initialized.');
    expect(stderr).toContain('Run: agentfeed init');
    expect(stderr).not.toContain('No local drafts found.');
  });

  it('guides users when no local draft exists for latest preview', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('No local drafts found.');
    expect(stderr).toContain('Create a draft:');
    expect(stderr).toContain('Run: agentfeed collect --explain');
    expect(stderr).toContain('Run: agentfeed share --dry');
    expect(stderr).toContain('Inspect saved drafts:');
    expect(stderr).toContain('Run: agentfeed drafts');
  });

  it('guides users back to drafts and collect when previewing a missing draft id', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--id', 'draft_missing']);

    expect(stdout).toBe('');
    expect(stderr).toContain('Draft not found: draft_missing');
    expect(stderr).toContain('Inspect saved drafts:');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).toContain('Create a fresh draft:');
    expect(stderr).toContain('Run: agentfeed collect --explain');
  });

  it('guides login before remote preview when no token is configured', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote preview needs login';
    await writeDraft(dir, draft);

    const { stdout, stderr } = runPreviewFailure(['preview', '--id', draft.id, '--remote']);

    expect(stdout).toBe('');
    expect(stderr).toContain('AgentFeed token is missing.');
    expect(stderr).toContain('Run: agentfeed login');
    expect(stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
  });

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
            preview: { title: 'Remote JSON preview', metrics_row: '1 file' },
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
      const output = JSON.parse(stdout) as { draft_id?: string; valid: boolean; preview: { title?: string }; warnings: string[]; next_actions?: string[] };
      expect(output.draft_id).toBe(draft.id);
      expect(output.valid).toBe(true);
      expect(output.preview.title).toBe('Remote JSON preview');
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
            preview: { title: 'Remote invalid preview' },
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
      const output = JSON.parse(stdout) as { draft_id?: string; valid?: boolean; warnings?: string[]; next_actions?: string[] };
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
      let failure: { stdout?: string | Buffer; stderr?: string | Buffer } | undefined;
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
        failure = error as { stdout?: string | Buffer; stderr?: string | Buffer };
      }

      expect(String(failure?.stdout ?? '')).toBe('');
      expect(String(failure?.stderr ?? '')).toContain('API compatibility check failed');
      expect(String(failure?.stderr ?? '')).toContain('before uploading drafts');
      expect(String(failure?.stderr ?? '')).toContain('Run: agentfeed doctor');
      expect(String(failure?.stderr ?? '')).not.toContain('af_live_preview_incompatible');
      expect(metadataCount).toBe(1);
      expect(previewCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('keeps action guidance in human-readable preview output', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Preview actions';
    draft.worklog.summary = 'Preview should keep action guidance.';
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('AgentFeed preview');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Details');
    expect(stdout).toContain(`ID: ${draft.id}`);
    expect(stdout).toContain('Title: Preview actions');
    expect(stdout).toContain('Upload: pending');
    expect(stdout).toContain('Next');
    expect(stdout).not.toContain('Actions:');
    expect(stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });

  it('points uploaded draft previews at the trusted open workflow first', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Uploaded preview actions';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_preview',
      review_url: 'https://agentfeed.dev/worklogs/worklog_uploaded_preview/review'
    };
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('Upload: uploaded');
    expect(stdout).toContain('Review URL: https://agentfeed.dev/worklogs/worklog_uploaded_preview/review');
    expect(stdout).toContain(`agentfeed open --id ${draft.id}`);
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });

  it('redacts public draft fields before rendering JSON output', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = 'Preview should hide sk-abcdefghijklmnopqrstuvwxyz1234567890';
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id,
      '--json'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234567890');
    const rendered = JSON.parse(stdout) as { worklog: { summary?: string }; privacy_scan: { status?: string }; next_actions?: string[] };
    expect(rendered.worklog.summary).toBe('Preview should hide [REDACTED_SECRET]');
    expect(rendered.privacy_scan.status).toBe('danger');
    expect(rendered.next_actions).toEqual([
      `agentfeed publish --id ${draft.id} --yes`,
      `agentfeed scan --id ${draft.id}`
    ]);

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Preview should hide [REDACTED_SECRET]');
  });

  it('points uploaded draft preview JSON at the trusted open workflow first', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Uploaded preview JSON actions';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_preview_json',
      review_url: 'https://agentfeed.dev/worklogs/worklog_uploaded_preview_json/review'
    };
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id,
      '--json'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const rendered = JSON.parse(stdout) as { id?: string; upload?: { uploaded?: boolean }; next_actions?: string[] };
    expect(rendered.id).toBe(draft.id);
    expect(rendered.upload?.uploaded).toBe(true);
    expect(rendered.next_actions).toEqual([
      `agentfeed open --id ${draft.id}`,
      `agentfeed scan --id ${draft.id}`
    ]);
    expect(stdout).not.toContain('AgentFeed preview');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });
});
