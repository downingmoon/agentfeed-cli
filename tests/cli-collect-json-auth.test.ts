import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage } from 'node:http';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CommandFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

type CollectDraftOutput = {
  readonly id: string;
  readonly next_actions?: readonly string[];
};

type CollectErrorOutput = {
  readonly error: { readonly message: string };
  readonly next_actions?: readonly string[];
};

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-json-auth-'));
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string') throw new Error(`expected string field: ${key}`);
  return field;
}

function stringArrayField(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error('expected optional string array');
  }
  return value;
}

function parseCollectDraftOutput(stdout: string): CollectDraftOutput {
  const value: unknown = JSON.parse(stdout);
  if (!isRecord(value)) throw new Error('collect output must be a JSON object');
  return {
    id: stringField(value, 'id'),
    next_actions: stringArrayField(value.next_actions)
  };
}

function parseCollectErrorOutput(stdout: string | undefined): CollectErrorOutput {
  const value: unknown = JSON.parse(stdout ?? '{}');
  if (!isRecord(value) || !isRecord(value.error)) throw new Error('collect error output must contain error object');
  return {
    error: { message: stringField(value.error, 'message') },
    next_actions: stringArrayField(value.next_actions)
  };
}

function commandFailureFrom(error: unknown): CommandFailure {
  if (!isRecord(error)) return {};
  const stdout = error.stdout;
  const stderr = error.stderr;
  return {
    stdout: typeof stdout === 'string' ? stdout : undefined,
    stderr: typeof stderr === 'string' ? stderr : undefined
  };
}

async function runCollectExpectingFailure(args: readonly string[], env: NodeJS.ProcessEnv): Promise<CommandFailure> {
  try {
    await execFileAsync(process.execPath, [cliPath, 'collect', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env
    });
  } catch (error) {
    return commandFailureFrom(error);
  }
  throw new Error('expected collect command to fail');
}

async function drainRequestBody(req: IncomingMessage): Promise<void> {
  for await (const chunk of req) {
    if (chunk instanceof Buffer) continue;
  }
}

describe('collect JSON auth and compatibility handling', () => {
  it('prints parseable collect JSON without human UX headings or ANSI styling', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-clean";\n');

    const stdout = execFileSync(process.execPath, [cliPath, 'collect', '--json', '--all', '--no-save-cursor'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = parseCollectDraftOutput(stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
    expect(stdout).not.toContain('\u001b[');
    expect(stdout).not.toMatch(/(^|\n)(AgentFeed draft|Summary|Signals|Collection|Next|ID:|Preview:|Upload:)/);
  });

  it('guides login before collect JSON upload when no token is configured', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-needs-login";\n');

    const failure = await runCollectExpectingFailure(['--json', '--upload', '--all', '--no-save-cursor'], {
      ...process.env,
      HOME: home,
      AGENTFEED_TOKEN: '',
      AGENTFEED_API_BASE_URL: undefined,
      AGENTFEED_ALLOW_INSECURE_API: undefined
    });
    const output = parseCollectErrorOutput(failure.stdout);
    expect(output.error.message).toContain('AgentFeed token is missing.');
    expect(output.next_actions).toEqual([
      'agentfeed login',
      'printf %s "$TOKEN" | agentfeed login --token-stdin'
    ]);
    expect(failure.stderr ?? '').toBe('');
    const draftFiles = await readdir(join(dir, '.agentfeed', 'drafts')).catch(() => []);
    expect(draftFiles.filter((file) => file.endsWith('.json'))).toHaveLength(0);
  });

  it('guides login before human collect upload without creating a draft', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "human-upload-needs-login";\n');

    const failure = await runCollectExpectingFailure(['--upload', '--all', '--no-save-cursor'], {
      ...process.env,
      HOME: home,
      AGENTFEED_TOKEN: '',
      AGENTFEED_API_BASE_URL: undefined,
      AGENTFEED_ALLOW_INSECURE_API: undefined
    });
    expect(failure.stdout ?? '').toBe('');
    expect(failure.stderr ?? '').toContain('AgentFeed token is missing.');
    expect(failure.stderr ?? '').toContain('Run: agentfeed login');
    expect(failure.stderr ?? '').toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
    const draftFiles = await readdir(join(dir, '.agentfeed', 'drafts')).catch(() => []);
    expect(draftFiles.filter((file) => file.endsWith('.json'))).toHaveLength(0);
  });

  it('refuses collect JSON upload before token check or ingest when API metadata is incompatible', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-incompatible-api";\n');
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
        await drainRequestBody(req);
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
      const failure = await runCollectExpectingFailure(['--json', '--upload', '--all', '--no-save-cursor'], {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_collect_incompatible_api',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
      });
      const output = parseCollectErrorOutput(failure.stdout);
      expect(output.error.message).toContain('API compatibility check failed');
      expect(output.error.message).toContain('before uploading drafts');
      expect(output.next_actions).toEqual(['agentfeed doctor', 'agentfeed status', 'agentfeed collect --json --upload']);
      expect(failure.stdout ?? '').not.toContain('af_live_collect_incompatible_api');
      expect(failure.stderr ?? '').toBe('');
      expect(metadataCount).toBe(1);
      expect(tokenStatusCount).toBe(0);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
