import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/;

let dir: string;
let home: string;

type StatusJsonOutput = {
  readonly health: string;
  readonly summary: { readonly status: string; readonly ready: number; readonly attention: number; readonly total: number };
  readonly readiness: Array<{ readonly name: string; readonly status: string; readonly detail: string; readonly next_action?: string }>;
  readonly account: { readonly token_configured: boolean; readonly token_expires_at: string | null };
  readonly api: { readonly base_url: string };
  readonly project: { readonly initialized: boolean; readonly name: string | null };
  readonly collection: { readonly local_drafts_count: number; readonly pending_upload_count: number };
  readonly warnings: string[];
  readonly next_actions: string[];
};

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-status-output-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status output contracts', () => {
  it('status presents sectioned UX copy while preserving required diagnostics', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'status-polish'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://agentfeed.api.downingmoon.dev/v1',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('AgentFeed status');
    expect(stdout).toContain('Readiness');
    expect(stdout).toContain('Setup progress: 3/5 ready · 2 need attention');
    expect(stdout).toContain('API: base URL accepted');
    expect(stdout).toContain('Account: token missing → agentfeed login');
    expect(stdout).toContain('Project: initialized');
    expect(stdout).toContain('Uploads: no pending uploads');
    expect(stdout).toContain('Account');
    expect(stdout).toContain('Project');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('User/token source: missing');
    expect(stdout).toContain('API base URL: https://agentfeed.api.downingmoon.dev/v1');
    expect(stdout).toContain('Project initialized: yes');
    expect(stdout).toContain('Project name: status-polish');
    expect(stdout).toContain('Git repository:');
    expect(stdout).toContain('Claude Code hook:');
    expect(stdout).toContain('Local drafts count:');
    expect(stdout).toContain('Pending upload count:');
  });

  it('status prints without ANSI escapes when NO_COLOR is set', async () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://agentfeed.api.downingmoon.dev/v1',
        NO_COLOR: '1',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('status prints without ANSI escapes when stdout is not a TTY', async () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://agentfeed.api.downingmoon.dev/v1',
        NO_COLOR: '',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('status json prints parseable automation output without headings or secrets', async () => {
    const token = 'af_live_status_json_secret';
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'status-json'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: token,
      token_expires_at: '2026-06-15T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        FORCE_COLOR: undefined
      }
    });

    const output: StatusJsonOutput = JSON.parse(stdout);
    expect(stderr).toBe('');
    expect(output.health).toBeTruthy();
    expect(output.summary).toEqual({ status: 'attention_needed', ready: 4, attention: 1, total: 5 });
    expect(output.readiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'API', status: 'ready', detail: 'base URL accepted' }),
      expect.objectContaining({ name: 'Account', status: 'ready', detail: 'token configured' }),
      expect.objectContaining({ name: 'Project', status: 'ready', detail: 'initialized' }),
      expect.objectContaining({ name: 'Uploads', status: 'ready', detail: 'no pending uploads' })
    ]));
    expect(output.account.token_configured).toBe(true);
    expect(output.account.token_expires_at).toBe('2026-06-15T00:00:00Z');
    expect(output.api.base_url).toBe('http://127.0.0.1:9/v1');
    expect(output.project).toMatchObject({ initialized: true, name: 'status-json' });
    expect(output.collection.local_drafts_count).toBe(0);
    expect(output.collection.pending_upload_count).toBe(0);
    expect(Array.isArray(output.warnings)).toBe(true);
    expect(output.next_actions).toEqual(['agentfeed share --yes']);
    expect(stdout).not.toContain('AgentFeed status');
    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stdout).not.toContain(token);
  });
});
