import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync, spawn } from 'node:child_process';
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

function isolatedCliEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: home,
    AGENTFEED_TOKEN: '',
    AGENTFEED_API_BASE_URL: undefined,
    AGENTFEED_ALLOW_INSECURE_API: undefined,
    ...extra
  };
}

async function runCliFailure(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ stdout: string; stderr: string }> {
  try {
    await execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: isolatedCliEnv(env)
    });
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
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
      token: {
        id: 'token_test',
        name: 'CLI test token',
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

function spawnAgentFeedJson(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: dir,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(`agentfeed ${args.join(' ')} failed with code ${code}`), { code, stdout, stderr }));
    });
  });
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
  it('guides draft creation before login when publishing with no local drafts', async () => {
    const latest = await runCliFailure(['publish', '--latest', '--yes']);
    expect(latest.stdout).toBe('');
    expect(latest.stderr).toContain('No local drafts found.');
    expect(latest.stderr).toContain('Run: agentfeed collect --explain');
    expect(latest.stderr).toContain('Run: agentfeed share --dry');
    expect(latest.stderr).not.toContain('AgentFeed token is missing.');

    const missingId = await runCliFailure(['publish', '--id', 'draft_missing', '--yes']);
    expect(missingId.stdout).toBe('');
    expect(missingId.stderr).toContain('Draft not found: draft_missing');
    expect(missingId.stderr).toContain('Run: agentfeed drafts');
    expect(missingId.stderr).toContain('Run: agentfeed collect --explain');
    expect(missingId.stderr).not.toContain('AgentFeed token is missing.');
  });

  it('prints polished human-readable dry-run share preview sections and publish guidance', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\nexport const shareDryPreview = true;\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'share',
      '--dry',
      '--all'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed share preview');
    expect(stdout).toContain('Ready to share private review draft.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Signals');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Target');
    expect(stdout).toContain('Upload target: private AgentFeed review draft');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Dry run complete. Local draft kept:');
    expect(stdout).toContain('Publish later:');
    expect(stdout).toContain('agentfeed publish --id');
    expect(stdout).toContain('agentfeed preview --id');
  });

  it('fails malformed project config with actionable recovery before share dry-run', async () => {
    await writeFile(join(dir, '.agentfeed', 'config.json'), '{not-json');

    const failure = await runCliFailure(['share', '--dry', '--all']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(failure.stderr).toContain('Re-run agentfeed init or restore the file from backup');
    expect(failure.stderr).not.toContain('Unexpected token');
  });

  it('fails malformed project config shape before share dry-run collection', async () => {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = 'not-an-array';
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const failure = await runCliFailure(['share', '--dry', '--all']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed config is invalid');
    expect(failure.stderr).toContain('project.tags must be an array of strings');
    expect(failure.stderr).toContain('Re-run agentfeed init or restore the file from backup');
    expect(failure.stderr).not.toContain('TypeError');
  });

  it('guides login when share or publish needs a token', async () => {
    const share = await runCliFailure(['share', '--yes', '--all']);
    expect(share.stdout).toBe('');
    expect(share.stderr).toContain('AgentFeed token is missing.');
    expect(share.stderr).toContain('Run: agentfeed login');
    expect(share.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');

    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Publish needs login';
    await writeDraft(dir, draft);

    const publish = await runCliFailure(['publish', '--id', draft.id, '--yes']);
    expect(publish.stdout).toBe('');
    expect(publish.stderr).toContain('AgentFeed token is missing.');
    expect(publish.stderr).toContain('Run: agentfeed login');
    expect(publish.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
  });

  it('prints parseable share JSON without human UX headings or ANSI styling', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\nexport const shareJsonPreview = true;\n');

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      'share',
      '--json',
      '--dry-run',
      '--all'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const output = JSON.parse(stdout) as { dry_run?: boolean; draft?: { id?: string } };
    expect(stderr).toBe('');
    expect(output.dry_run).toBe(true);
    expect(output.draft?.id).toMatch(/^draft_/);
    expect(stdout).not.toContain('\u001b[');
    expect(stdout).not.toMatch(/(^|\n)(AgentFeed share preview|Ready to share private review draft|Summary|Collection quality|Next|Publish later)/);
  });

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
      expect(stdout).toMatch(/agentfeed open --id draft_/);
      expect(stdout).toMatch(/agentfeed preview --id draft_/);
      expect(stdout).not.toContain('Handoff');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('refuses share upload before ingest when API metadata is incompatible', async () => {
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            service: 'agentfeed-api',
            api_version: 'v1',
            backend_version: '0.1.0',
            contract_version: '1999-01-01',
            supported_clients: {
              cli: { min_version: '99.0.0', contract_version: '1999-01-01' }
            }
          }
        }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = await writeCodexShareSession('share-incompatible-api', 'gpt-incompatible-api', 'incompatibleApi');
      await expect(spawnAgentFeedJson([
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard'
      ], {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_incompatible_api',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('API compatibility check failed')
      });
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('refuses share upload before ingest when the ingestion token preflight fails', async () => {
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
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = await writeCodexShareSession('share-invalid-token', 'gpt-invalid-token', 'invalidToken');
      await expect(spawnAgentFeedJson([
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard'
      ], {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_invalid_token',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('Ingestion token check failed')
      });
      expect(tokenStatusCount).toBe(1);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('refuses direct publish before ingest when the ingestion token preflight fails', async () => {
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
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Invalid token publish';
      await writeDraft(dir, draft);

      await expect(execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_invalid_token',
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

  it('refuses direct publish before token check or ingest when API metadata is incompatible', async () => {
    let metadataCount = 0;
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'unexpected-api' } }));
        return;
      }
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { ok: true } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Incompatible API publish';
      await writeDraft(dir, draft);

      let failure: { stdout?: string; stderr?: string } | undefined;
      try {
        await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes'], {
          cwd: dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            HOME: home,
            AGENTFEED_TOKEN: 'af_live_publish_incompatible_api',
            AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
          }
        });
      } catch (error) {
        failure = error as { stdout?: string; stderr?: string };
      }

      expect(failure?.stdout ?? '').toBe('');
      expect(failure?.stderr ?? '').toContain('API compatibility check failed');
      expect(failure?.stderr ?? '').toContain('before uploading drafts');
      expect(failure?.stderr ?? '').toContain('Run: agentfeed doctor');
      expect(failure?.stderr ?? '').not.toContain('af_live_publish_incompatible_api');
      expect(metadataCount).toBe(1);
      expect(tokenStatusCount).toBe(0);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('requires explicit confirmation before interactive share uploads', async () => {
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = await writeCodexShareSession('share-confirmation-required', 'gpt-confirm-share', 'confirmShare');
      const share = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_confirmation_required',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1'
        }
      });

      expect(share.stdout).toContain('AgentFeed upload paused');
      expect(share.stdout).toContain('Upload confirmation required.');
      expect(share.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(share.stdout).toContain('Summary');
      expect(share.stdout).toContain('Next');
      expect(share.stdout).toContain('Upload after reviewing this draft:');
      expect(share.stdout).toContain('agentfeed publish --id');
      expect(share.stdout).toContain('--yes');
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('requires explicit confirmation before direct interactive publish uploads', async () => {
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Confirmation gated publish';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_confirmation_required',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1'
        }
      });

      expect(publish.stdout).toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(publish.stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });


  it('requires explicit upload intent before fresh human-readable publish uploads even in CI', async () => {
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'CI confirmation gated publish';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_confirmation_required',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(publish.stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('allows --yes to bypass the interactive publish confirmation gate', async () => {
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestRequestCount += 1;
      await readRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_publish_confirmed',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_confirmed/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-publish-confirmed-bin-'));
    const browserLog = await installFakeBrowserOpener(fakeBin);
    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Confirmed publish';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes', '--no-clipboard'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_confirmation_confirmed',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
          AGENTFEED_CI: '1',
          CI: '0'
        }
      });

      expect(publish.stdout).toContain('Private review draft uploaded.');
      expect(publish.stdout).toContain('AgentFeed upload complete');
      expect(publish.stdout).toContain('Summary');
      expect(publish.stdout).toContain(`Draft: ${draft.id}`);
      expect(publish.stdout).toContain('Status: needs_review');
      expect(publish.stdout).toContain('Review URL:');
      expect(publish.stdout).toContain('http://localhost:3001/worklogs/worklog_publish_confirmed/review');
      expect(publish.stdout).toContain('Next');
      expect(publish.stdout).toContain(`agentfeed open --id ${draft.id}`);
      expect(publish.stdout).toContain(`agentfeed preview --id ${draft.id}`);
      expect(publish.stdout).not.toContain('Handoff');
      expect(ingestRequestCount).toBe(1);
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('refuses unsafe cached review URLs before invoking the browser opener', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_existing',
      review_url: 'https://evil.example/worklogs/worklog_existing/review',
      uploaded_at: '2026-05-30T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const run = execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog
        }
      });

      await expect(run).rejects.toMatchObject({ code: 1 });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('prints a structured manual review URL fallback when the browser cannot be opened', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_manual_open',
      review_url: 'https://agentfeed.dev/worklogs/worklog_manual_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);

    const open = await execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1',
        AGENTFEED_TEST_BROWSER_LOG: ''
      }
    });

    expect(open.stdout).toContain('AgentFeed review URL');
    expect(open.stdout).toContain('Browser open failed. Open this URL manually:');
    expect(open.stdout).toContain('Summary');
    expect(open.stdout).toContain(`Draft: ${draft.id}`);
    expect(open.stdout).toContain('Review URL:');
    expect(open.stdout).toContain('https://agentfeed.dev/worklogs/worklog_manual_open/review');
    expect(open.stdout).toContain('Next');
    expect(open.stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(open.stdout).toContain('agentfeed status');
  });

  it('opens a trusted AgentFeed review URL from a saved uploaded draft', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_trusted_open',
      review_url: 'https://agentfeed.dev/worklogs/worklog_trusted_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = await execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog
        }
      });

      expect(open.stdout).toContain('Opened review URL.');
      expect(open.stdout).toContain('AgentFeed review opened');
      expect(open.stdout).toContain('Summary');
      expect(open.stdout).toContain(`Draft: ${draft.id}`);
      expect(open.stdout).toContain('Review URL:');
      expect(open.stdout).toContain('Next');
      expect(open.stdout).toContain(`agentfeed preview --id ${draft.id}`);
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://agentfeed.dev/worklogs/worklog_trusted_open/review\n');
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('trusts local review URLs for agentfeed open when a local API base is configured', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_local_open',
      review_url: 'http://127.0.0.1:3001/worklogs/worklog_local_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = await execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'http://localhost:3001/v1'
        }
      });

      expect(open.stdout).toContain('Opened review URL.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://127.0.0.1:3001/worklogs/worklog_local_open/review\n');
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('trusts the draft upload API base when current API config has changed', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_stored_upload_base',
      review_url: 'https://api.internal.example/worklogs/worklog_stored_upload_base/review',
      uploaded_at: '2026-05-31T00:00:00.000Z',
      api_base_url: 'https://api.internal.example/v1'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = await execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'https://api.other.example/v1'
        }
      });

      expect(open.stdout).toContain('Opened review URL.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://api.internal.example/worklogs/worklog_stored_upload_base/review\n');
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('rejects saved review URLs when neither stored upload base nor current config trusts them', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_untrusted_stored_base',
      review_url: 'https://review.internal.example/worklogs/worklog_untrusted_stored_base/review',
      uploaded_at: '2026-05-31T00:00:00.000Z',
      api_base_url: 'https://api.internal.example/v1'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'https://api.other.example/v1',
          AGENTFEED_REVIEW_BASE_URL: ''
        }
      });

      await expect(open).rejects.toMatchObject({ code: 1 });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('opens a split-host review URL when the review frontend origin is explicitly configured', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_split_host_open',
      review_url: 'https://review.internal.example/worklogs/worklog_split_host_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = await execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'https://api.internal.example/v1',
          AGENTFEED_REVIEW_BASE_URL: 'https://review.internal.example'
        }
      });

      expect(open.stdout).toContain('Opened review URL.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://review.internal.example/worklogs/worklog_split_host_open/review\n');
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('opens a split-host review URL when saved upload metadata contains the review frontend origin', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_split_host_saved_metadata',
      review_url: 'https://review.internal.example/worklogs/worklog_split_host_saved_metadata/review',
      review_base_url: 'https://review.internal.example',
      uploaded_at: '2026-05-19T00:00:00Z',
      ...cachedUploadBindingForEnv({ apiBaseUrl: 'https://api.internal.example/v1' })
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);
    try {
      const open = await execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'https://api.other.example/v1'
        }
      });

      expect(open.stdout).toContain('Opened review URL.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://review.internal.example/worklogs/worklog_split_host_saved_metadata/review\n');
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('rejects split-host review URLs when no explicit review frontend origin is configured', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_split_host_no_env',
      review_url: 'https://review.internal.example/worklogs/worklog_split_host_no_env/review',
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'https://api.internal.example/v1',
          AGENTFEED_REVIEW_BASE_URL: ''
        }
      });

      await expect(open).rejects.toMatchObject({ code: 1 });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it.each([
    'https://review.internal.example/worklogs/worklog_split_host_bad/review?token=leak',
    'https://review.internal.example/worklogs/worklog_split_host_bad/review#secret',
    'http://review.internal.example/worklogs/worklog_split_host_bad/review',
    'https://review.internal.example.evil.com/worklogs/worklog_split_host_bad/review'
  ])('rejects unsafe split-host review URLs before invoking the browser opener: %s', async (reviewUrl) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_split_host_bad',
      review_url: reviewUrl,
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'https://api.internal.example/v1',
          AGENTFEED_REVIEW_BASE_URL: 'https://review.internal.example'
        }
      });

      await expect(open).rejects.toMatchObject({ code: 1 });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('rejects fake 127-prefixed local review hostnames before invoking the browser opener', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_fake_local_open',
      review_url: 'http://127.evil.com:3001/worklogs/worklog_fake_local_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z'
    };
    await writeDraft(dir, draft);
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    const browserLog = await installFakeBrowserOpener(binDir);

    try {
      const open = execFileAsync(process.execPath, [cliPath, 'open', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: 'http://localhost:3001/v1'
        }
      });

      await expect(open).rejects.toMatchObject({ code: 1 });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('includes the collected draft in uploaded JSON output for smoke verification', async () => {
    let ingestPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
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
        draft?: { id?: string; worklog?: { user_note?: string | null; summary?: string; model?: string | null }; upload?: Record<string, unknown> };
        upload?: { id?: string };
      };
      expect(output.upload?.id).toBe('worklog_share_json');
      expect(output.draft?.worklog?.user_note).toBe('Smoke author note');
      expect(output.draft?.worklog?.summary).not.toContain('Smoke author note');
      expect(output.draft?.worklog?.model).toBe('gpt-share-json');
      const savedDraft = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${output.draft?.id}.json`), 'utf8'));
      expect(output.draft?.upload).toEqual(savedDraft.upload);
      expect(output.draft?.upload?.payload_hash).toBe(draftUploadPayloadHash(output.draft as Parameters<typeof draftUploadPayloadHash>[0]));
      expect(output.draft?.upload?.credential_binding_hash).toBe(draftUploadCredentialBindingHash({
        ingestion_token: 'af_live_test_token',
        api_base_url: `http://127.0.0.1:${address.port}/v1`,
        created_at: 'test'
      }));
      expect((ingestPayload?.worklog as { user_note?: string } | undefined)?.user_note).toBe('Smoke author note');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not copy or open review URLs for share JSON by default', async () => {
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
          id: 'worklog_share_json_default_side_effects',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json_default_side_effects/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-side-effects-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-default-side-effects', 'gpt-share-json-default', 'jsonDefaultSideEffects');
      const { stdout } = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as { upload?: { id?: string; review_url?: string } };
      expect(output.upload?.id).toBe('worklog_share_json_default_side_effects');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_share_json_default_side_effects/review');
      await expect(readFile(clipboardLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('copies and opens review URLs for share JSON only when explicitly requested', async () => {
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
          id: 'worklog_share_json_requested_side_effects',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-side-effects-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-requested-side-effects', 'gpt-share-json-requested', 'jsonRequestedSideEffects');
      const { stdout } = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--since',
        '2026-05-31T00:00:00Z',
        '--until',
        '2026-05-31T01:00:00Z',
        '--clipboard',
        '--open-review'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as { upload?: { review_url?: string } };
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review');
      await expect(readFile(clipboardLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review\n');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reports requested share JSON review URL handoff failures inside the JSON payload', async () => {
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
          id: 'worklog_share_json_failed_handoff',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json_failed_handoff/review',
          created_at: '2026-06-01T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-failed-handoff', 'gpt-share-json-handoff', 'jsonFailedHandoff');
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--clipboard',
        '--open-review'
      ], {
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

      const output = JSON.parse(stdout) as {
        upload?: { review_url?: string };
        handoff?: {
          clipboard?: { requested?: boolean; ok?: boolean; warning?: string };
          browser?: { requested?: boolean; ok?: boolean; warning?: string };
        };
      };
      expect(stderr).toBe('');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_share_json_failed_handoff/review');
      expect(output.handoff?.clipboard).toMatchObject({ requested: true, ok: false });
      expect(output.handoff?.clipboard?.warning).toContain('not copied');
      expect(output.handoff?.browser).toMatchObject({ requested: true, ok: false });
      expect(output.handoff?.browser?.warning).toContain('could not be opened');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not copy or open review URLs when share JSON upload fails', async () => {
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readRequestBody(req);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'boom', details: {} } }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-side-effects-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-failed-side-effects', 'gpt-share-json-failed', 'jsonFailedSideEffects');
      const run = execFileAsync(process.execPath, [
        cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--clipboard',
        '--open-review'
      ], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      await expect(run).rejects.toMatchObject({ code: 1 });
      await expect(readFile(clipboardLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readCollectionState(dir)).resolves.toEqual({});
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('redacts reused draft secrets before JSON output and upload', async () => {
    const secret = 'sk-123456789012345678901234';
    let ingestPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
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

  it('still requires confirmation for a cached upload from a different credential binding', async () => {
    let requestCount = 0;
    const server = createServer((_req, res) => {
      requestCount += 1;
      res.writeHead(500).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const apiBaseUrl = `http://127.0.0.1:${address.port}/v1`;
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.upload = {
        uploaded: true,
        worklog_id: 'worklog_other_binding',
        review_url: 'http://localhost:3001/worklogs/worklog_other_binding/review',
        uploaded_at: '2026-05-31T00:00:00.000Z',
        payload_hash: draftUploadPayloadHash(draft),
        ...cachedUploadBindingForEnv({ token: 'old-token', apiBaseUrl })
      };
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'new-token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(publish.stdout).toContain('Saved private review cache cannot be reused: saved upload was created with a different token or user binding.');
      expect(requestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('checks API compatibility before uploading when cached upload binding is not reusable', async () => {
    let metadataCount = 0;
    let ingestCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'unexpected-api' } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestCount += 1;
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'worklog_should_not_upload',
            status: 'needs_review',
            visibility: 'private',
            review_url: 'http://localhost:3001/worklogs/worklog_should_not_upload/review',
            created_at: '2026-05-31T00:00:00.000Z'
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
      const apiBaseUrl = `http://127.0.0.1:${address.port}/v1`;
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.upload = {
        uploaded: true,
        worklog_id: 'worklog_old_api',
        review_url: 'http://localhost:3001/worklogs/worklog_old_api/review',
        uploaded_at: '2026-05-31T00:00:00.000Z',
        payload_hash: draftUploadPayloadHash(draft),
        ...cachedUploadBindingForEnv({ token: 'old-token', apiBaseUrl })
      };
      await writeDraft(dir, draft);

      await expect(execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--yes'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'new-token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          CI: '1'
        }
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('API compatibility check failed')
      });

      expect(metadataCount).toBe(1);
      expect(ingestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('checks API compatibility and token status before reusing a cached upload', async () => {
    let metadataCount = 0;
    let tokenStatusCount = 0;
    let ingestCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        handleCompatibleMetadata(req, res);
        return;
      }
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token' } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestCount += 1;
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const apiBaseUrl = `http://127.0.0.1:${address.port}/v1`;
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.upload = {
        uploaded: true,
        worklog_id: 'worklog_reusable_token_check',
        review_url: 'http://localhost:3001/worklogs/worklog_reusable_token_check/review',
        uploaded_at: '2026-05-31T00:00:00.000Z',
        payload_hash: draftUploadPayloadHash(draft),
        ...cachedUploadBindingForEnv({ apiBaseUrl })
      };
      await writeDraft(dir, draft);

      await expect(execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
          CI: '1'
        }
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('Ingestion token check failed')
      });

      expect(metadataCount).toBe(1);
      expect(tokenStatusCount).toBe(1);
      expect(ingestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('skips forced confirmation only when the cached upload is reusable for the current payload and credentials', async () => {
    const preflight = await startUploadPreflightServer();
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_reusable_cli_cache',
      review_url: 'http://localhost:3001/worklogs/worklog_reusable_cli_cache/review',
      uploaded_at: '2026-05-31T00:00:00.000Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...cachedUploadBindingForEnv({ apiBaseUrl: preflight.apiBaseUrl })
    };
    await writeDraft(dir, draft);

    try {
      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Private review draft already uploaded; reusing existing review URL.');
      expect(publish.stdout).not.toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('http://localhost:3001/worklogs/worklog_reusable_cli_cache/review');
    } finally {
      await preflight.close();
    }
  });

  it('makes direct publish privacy policy clear for high-severity private review drafts', async () => {
    const preflight = await startUploadPreflightServer();
    const secret = 'sk-123456789012345678901234';
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = `Manual edit contains ${secret}`;
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_privacy_policy',
      review_url: 'http://localhost:3001/worklogs/worklog_privacy_policy/review',
      uploaded_at: '2026-05-31T00:00:00.000Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...cachedUploadBindingForEnv({ apiBaseUrl: preflight.apiBaseUrl })
    };
    await writeDraft(dir, draft);

    try {
      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Private review draft already uploaded; reusing existing review URL.');
      expect(publish.stdout).toContain('Privacy review: required before public publishing.');
      expect(publish.stdout).toContain('Public/unlisted publishing is blocked in AgentFeed until high-severity findings are resolved.');
      expect(publish.stdout).toContain('Private review upload is allowed so you can resolve findings in the web review.');
      const saved = await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8');
      expect(saved).not.toContain(secret);
    } finally {
      await preflight.close();
    }
  });

  it('prints machine-readable publish JSON and copies the review URL only when requested', async () => {
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
          id: 'worklog_publish_json',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_json/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-clipboard-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Publish JSON';
      draft.worklog.summary = 'Machine readable publish output';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--json', '--clipboard'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(publish.stdout) as { draft_id: string; upload: { id: string; review_url: string }; privacy_policy?: { private_review_upload?: string; public_publish_blocked?: boolean; review_required?: boolean } };
      expect(output.draft_id).toBe(draft.id);
      expect(output.upload.id).toBe('worklog_publish_json');
      expect(output.upload.review_url).toBe('http://localhost:3001/worklogs/worklog_publish_json/review');
      expect(output.privacy_policy).toEqual({
        private_review_upload: 'allowed',
        public_publish_blocked: false,
        review_required: false
      });
      await expect(readFile(clipboardLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_publish_json/review');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not copy or open review URLs for publish JSON by default', async () => {
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
          id: 'worklog_publish_json_default_side_effects',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_json_default_side_effects/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-publish-json-default-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);
    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Publish JSON default side effects';
      draft.worklog.summary = 'Machine-readable publish must be quiet unless side effects are explicit.';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [cliPath, 'publish', '--id', draft.id, '--json'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(publish.stdout) as {
        upload?: { id?: string; review_url?: string };
        handoff?: {
          clipboard?: { requested?: boolean; ok?: boolean | null };
          browser?: { requested?: boolean; ok?: boolean | null };
        };
      };
      expect(output.upload?.id).toBe('worklog_publish_json_default_side_effects');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_publish_json_default_side_effects/review');
      expect(output.handoff?.clipboard).toMatchObject({ requested: false, ok: null });
      expect(output.handoff?.browser).toMatchObject({ requested: false, ok: null });
      await expect(readFile(clipboardLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reports requested publish JSON review URL handoff failures inside the JSON payload', async () => {
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
          id: 'worklog_publish_json_failed_handoff',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_json_failed_handoff/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-publish-json-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);
    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Publish JSON failed handoff';
      draft.worklog.summary = 'Machine-readable publish must report requested handoff failures.';
      await writeDraft(dir, draft);

      const publish = await execFileAsync(process.execPath, [
        cliPath,
        'publish',
        '--id',
        draft.id,
        '--json',
        '--clipboard',
        '--open-review'
      ], {
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

      const output = JSON.parse(publish.stdout) as {
        upload?: { id?: string; review_url?: string };
        handoff?: {
          clipboard?: { requested?: boolean; ok?: boolean; warning?: string };
          browser?: { requested?: boolean; ok?: boolean; warning?: string };
        };
      };
      expect(publish.stderr).toBe('');
      expect(output.upload?.id).toBe('worklog_publish_json_failed_handoff');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_publish_json_failed_handoff/review');
      expect(output.handoff?.clipboard).toMatchObject({ requested: true, ok: false });
      expect(output.handoff?.clipboard?.warning).toContain('not copied');
      expect(output.handoff?.browser).toMatchObject({ requested: true, ok: false });
      expect(output.handoff?.browser?.warning).toContain('could not be opened');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('serializes two publish processes for the same draft and issues one ingest request', async () => {
    const ingestPayloads: Record<string, unknown>[] = [];
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestPayloads.push(await readRequestBody(req));
      await new Promise(resolve => setTimeout(resolve, 250));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_two_process',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_two_process/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.worklog.title = 'Two process publish';
      draft.worklog.summary = 'Only one process should upload this draft.';
      await writeDraft(dir, draft);

      const env = {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
        CI: '1',
        AGENTFEED_CI: '1'
      };
      const runs = await Promise.all([
        spawnAgentFeedJson(['publish', '--id', draft.id, '--json', '--no-clipboard'], env),
        spawnAgentFeedJson(['publish', '--id', draft.id, '--json', '--no-clipboard'], env)
      ]);

      const outputs = runs.map(run => JSON.parse(run.stdout) as {
        draft_id?: string;
        upload?: { id?: string; review_url?: string; reused_existing?: boolean };
      });
      expect(ingestPayloads).toHaveLength(1);
      expect(outputs).toEqual([
        expect.objectContaining({ draft_id: draft.id, upload: expect.objectContaining({ id: 'worklog_two_process' }) }),
        expect.objectContaining({ draft_id: draft.id, upload: expect.objectContaining({ id: 'worklog_two_process' }) })
      ]);
      expect(outputs.some(output => output.upload?.reused_existing === true)).toBe(true);
      const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8')) as { upload?: { worklog_id?: string; review_url?: string } };
      expect(saved.upload).toMatchObject({
        worklog_id: 'worklog_two_process',
        review_url: 'http://localhost:3001/worklogs/worklog_two_process/review'
      });
      await expect(readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
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
      expect(publish.stdout).toContain('http://localhost:3001/worklogs/worklog_publish_failed_handoff/review');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
