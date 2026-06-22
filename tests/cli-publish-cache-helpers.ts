import { afterEach, beforeAll, beforeEach } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from '../src/api/client.js';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import type { LocalDraft } from '../src/types.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CliOutput = { readonly stdout: string; readonly stderr: string };
type TestServer = { readonly apiBaseUrl: string; readonly close: () => Promise<void> };
type ServerHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
type CachedUpload = NonNullable<LocalDraft['upload']>;

type CachedUploadOptions = {
  readonly token?: string;
  readonly apiBaseUrl?: string;
};

type UploadedDraftOptions = CachedUploadOptions & {
  readonly draft: LocalDraft;
  readonly worklogId: string;
  readonly reviewUrl: string;
  readonly uploadedAt?: string;
};

export function cachedUploadBindingForPublishCache(options: CachedUploadOptions = {}) {
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

export function cachedUploadForPublishCache(options: UploadedDraftOptions): CachedUpload {
  return {
    uploaded: true,
    worklog_id: options.worklogId,
    review_url: options.reviewUrl,
    uploaded_at: options.uploadedAt ?? '2026-05-31T00:00:00.000Z',
    payload_hash: draftUploadPayloadHash(options.draft),
    ...cachedUploadBindingForPublishCache({ token: options.token, apiBaseUrl: options.apiBaseUrl }),
  };
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
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' },
      },
    },
  };
}

export function writePublishCacheCompatibleMetadataResponse(res: ServerResponse): void {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(compatibleMetadataPayload()));
}

function handleCompatibleMetadata(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' || req.url !== '/v1/metadata') return false;
  writePublishCacheCompatibleMetadataResponse(res);
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
        avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4',
      },
      token: {
        id: 'token_test',
        name: 'CLI test token',
        created_at: '2026-06-01T00:00:00.000Z',
        last_used_at: null,
        expires_at: '2026-06-15T00:00:00.000Z',
        expires_in_seconds: 604800,
        expiring_soon: false,
      },
    },
  }));
  return true;
}

function handleUploadPreflight(req: IncomingMessage, res: ServerResponse): boolean {
  return handleCompatibleMetadata(req, res) || handleHealthyIngestionToken(req, res);
}

export async function startPublishCacheServer(handler: ServerHandler): Promise<TestServer> {
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return {
    apiBaseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}

export async function startPublishUploadPreflightServer(): Promise<TestServer> {
  return await startPublishCacheServer((req, res) => {
    if (handleUploadPreflight(req, res)) return;
    res.writeHead(404).end();
  });
}

export async function readPublishCacheRequestBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function usePublishCacheFixture() {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-publish-cache-'));
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

  function createDraft(): LocalDraft {
    return createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
  }

  async function writeDraftFile(draft: LocalDraft): Promise<void> {
    await writeDraft(dir, draft);
  }

  async function runPublish(args: readonly string[], env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    return await execFileAsync(process.execPath, [cliPath, 'publish', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, ...env },
    });
  }

  function runPublishAttempt(args: readonly string[], env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    return runPublish(args, env);
  }

  return { createDraft, dir: () => dir, runPublish, runPublishAttempt, writeDraftFile };
}
