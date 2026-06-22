import { beforeAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
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


beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-status-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status and doctor provenance output', () => {
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
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
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
    expect(stdout).toContain('API base URL: https://api.agentfeed.dev/v1');
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
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
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
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        NO_COLOR: '',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('status and doctor report empty git repositories before the first commit', async () => {
    execFileSync('git', ['init', '-q'], {
      cwd: dir,
      encoding: 'utf8',
      env: process.env
    });
    execFileSync(process.execPath, [cliPath, 'init', '--project-name', 'empty-git'], {
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
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        FORCE_COLOR: undefined
      }
    });
    expect(stdout).toContain('Git repository: yes');

    const { stdout: statusJsonStdout } = await execFileAsync(process.execPath, [cliPath, 'status', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        FORCE_COLOR: undefined
      }
    });
    const statusJson = JSON.parse(statusJsonStdout) as { project: { git_repository: boolean } };
    expect(statusJson.project.git_repository).toBe(true);

    const { stdout: doctorJsonStdout } = await execFileAsync(process.execPath, [cliPath, 'doctor', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://161.33.171.81:18080/v1',
        AGENTFEED_ALLOW_INSECURE_API: '',
        FORCE_COLOR: undefined
      }
    });
    const doctorJson = JSON.parse(doctorJsonStdout) as { project: Array<{ name: string; value: string }> };
    expect(doctorJson.project.find((row) => row.name === 'current directory is git repository')?.value).toBe('yes');
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

    const output = JSON.parse(stdout) as {
      health: string;
      summary: { status: string; ready: number; attention: number; total: number };
      readiness: Array<{ name: string; status: string; detail: string; next_action?: string }>;
      account: { token_configured: boolean; token_expires_at: string | null };
      api: { base_url: string };
      project: { initialized: boolean; name: string | null };
      collection: { local_drafts_count: number; pending_upload_count: number };
      warnings: string[];
      next_actions: string[];
    };
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

  it('prints package version for npm-installed CLI diagnostics', () => {
    const stdout = execFileSync(process.execPath, [cliPath, '--version'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    const shortStdout = execFileSync(process.execPath, [cliPath, '-v'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
    expect(shortStdout).toBe(stdout);
  });

  it('doctor reports credential and API source provenance before network checks', () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'doctor-cursor'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    execFileSync(process.execPath, [
      '-e',
      'require("node:fs").writeFileSync(".agentfeed/state.json", JSON.stringify({ last_collected_at: "2026-05-20T02:00:00.000Z" }))'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const stdout = execFileSync(process.execPath, [cliPath, 'doctor'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_env_status',
        AGENTFEED_API_BASE_URL: 'http://127.0.0.1:9/v1',
        AGENTFEED_API_TIMEOUT_MS: '50'
      }
    });

    expect(stdout).toContain('credential source: environment (AGENTFEED_TOKEN)');
    expect(stdout).toContain('Runtime');
    expect(stdout).toContain('Account');
    expect(stdout).toContain('API');
    expect(stdout).toContain('Project');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Agent signals');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('API base URL configured: http://127.0.0.1:9/v1');
    expect(stdout).toContain('API base URL source: environment (AGENTFEED_API_BASE_URL)');
    expect(stdout).toContain('API ready: no');
    expect(stdout).toContain('last collection cursor: 2026-05-20T02:00:00.000Z');
    expect(stdout).toContain('next default collection since: 2026-05-20T02:00:00.000Z');
  });



  it('doctor json prints parseable diagnostics without human headings', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://161.33.171.81:18080/v1',
        AGENTFEED_ALLOW_INSECURE_API: '',
        FORCE_COLOR: undefined
      }
    });

    const output = JSON.parse(stdout) as {
      runtime: Array<{ name: string; value: string }>;
      account: Array<{ name: string; value: string }>;
      api: Array<{ name: string; value: string }>;
      project: Array<{ name: string; value: string }>;
      collection: Array<{ name: string; value: string }>;
      summary: { status: string; ready: number; attention: number };
      readiness: Array<{ name: string; status: string; detail: string; next_action?: string }>;
      priority_actions: Array<{ name: string; detail: string; command: string }>;
      warnings: string[];
      agent_signal_summary: {
        detected_count: number;
        missing_count: number;
        signals: Array<{ key: string; label: string; detected: boolean; status: string; path_count: number; guidance: string; next_actions: string[] }>;
      };
      agent_signals: string[];
      next_actions: string[];
    };
    expect(stderr).toBe('');
    expect(output.summary.status).toBe('attention_needed');
    expect(output.summary.attention).toBeGreaterThan(0);
    expect(output.readiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' }),
      expect.objectContaining({ name: 'API', status: 'attention', detail: 'invalid API base URL', next_action: 'unset AGENTFEED_API_BASE_URL' })
    ]));
    expect(output.priority_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'API', detail: 'invalid API base URL', command: 'unset AGENTFEED_API_BASE_URL' }),
      expect.objectContaining({ name: 'Account', detail: 'token missing', command: 'agentfeed login' })
    ]));
    expect(output.priority_actions[0]).toMatchObject({ name: 'API', command: 'unset AGENTFEED_API_BASE_URL' });
    expect(output.runtime.some((row) => row.name === 'agentfeed version')).toBe(true);
    expect(output.account.some((row) => row.name === 'credential source')).toBe(true);
    expect(output.api.some((row) => row.name === 'API base URL configured')).toBe(true);
    expect(output.project.some((row) => row.name === 'project config valid')).toBe(true);
    expect(output.collection.some((row) => row.name === 'last collection cursor')).toBe(true);
    expect(output.warnings.join('\n')).toContain('invalid AgentFeed API URL setting ignored for diagnostics');
    expect(output.agent_signal_summary.detected_count + output.agent_signal_summary.missing_count).toBe(output.agent_signal_summary.signals.length);
    expect(output.agent_signal_summary.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'codex',
        label: 'Codex CLI',
        status: expect.stringMatching(/detected|missing/),
        next_actions: expect.arrayContaining(['agentfeed collect --source codex --explain'])
      }),
      expect.objectContaining({
        key: 'claude_code',
        label: 'Claude Code',
        next_actions: expect.arrayContaining(['agentfeed hook install claude-code'])
      })
    ]));
    expect(Array.isArray(output.agent_signals)).toBe(true);
    expect(output.next_actions).toEqual([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed doctor'
    ]);
    expect(stdout).not.toContain('AgentFeed doctor');
    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stdout).not.toContain('af_live');
  });

});
