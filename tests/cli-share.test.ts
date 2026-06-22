import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

type DryRunProjectConfig = {
  collection: Record<string, unknown> & { run_tests_on_collect?: boolean };
  commands: Record<string, unknown> & { test?: string | null; build?: string | null };
} & Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonRecord(text: string, label: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error(`${label} must be a JSON object`);
  return parsed;
}

function parseDryRunProjectConfig(text: string): DryRunProjectConfig {
  const parsed = parseJsonRecord(text, 'project config');
  if (!isRecord(parsed.collection) || !isRecord(parsed.commands)) throw new Error('project config is missing command settings');
  return {
    ...parsed,
    collection: {
      ...parsed.collection,
      run_tests_on_collect: parsed.collection.run_tests_on_collect === true
    },
    commands: {
      ...parsed.commands,
      test: typeof parsed.commands.test === 'string' ? parsed.commands.test : null,
      build: typeof parsed.commands.build === 'string' ? parsed.commands.build : null
    }
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

async function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return parseJsonRecord(Buffer.concat(chunks).toString('utf8'), 'request body');
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
    const config = parseDryRunProjectConfig(await readFile(configPath, 'utf8'));
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


});
