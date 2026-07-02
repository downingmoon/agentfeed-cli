import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
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

interface DraftListJsonOutput {
  readonly summary?: {
    readonly total?: number;
    readonly valid?: number;
    readonly invalid?: number;
    readonly pending?: number;
    readonly uploaded?: number;
  };
  readonly drafts?: readonly {
    readonly id?: string;
    readonly status?: string;
    readonly title?: string;
    readonly review_url?: string | null;
  }[];
  readonly next_actions?: readonly string[];
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-drafts-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1', AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1', ...extraEnv }
  });
}

async function runCliFailure(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    await runCli(args);
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}


describe('drafts CLI command', () => {
  it('guides project initialization before listing local drafts outside a project', async () => {
    await rm(join(dir, '.agentfeed'), { recursive: true, force: true });

    const failure = await runCliFailure(['drafts']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed project is not initialized.');
    expect(failure.stderr).toContain('Run: agentfeed init');
    expect(failure.stderr).not.toContain('No local drafts found.');
  });

  it('prints a helpful empty state with next actions', async () => {
    const { stdout, stderr } = await runCli(['drafts']);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed drafts (0)');
    expect(stdout).toContain('No local drafts found.');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed collect --explain');
    expect(stdout).toContain('  2. agentfeed share --dry');
  });

  it('prints human-readable draft summaries with preview and upload guidance', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Refined CLI draft list';
    draft.worklog.metrics.files_changed = 2;
    draft.worklog.metrics.lines_added = 42;
    draft.worklog.metrics.lines_removed = 7;
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['drafts']);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed drafts (1)');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Total: 1');
    expect(stdout).toContain('Pending upload: 1');
    expect(stdout).toContain('Uploaded: 0');
    expect(stdout).toContain('Order: newest first');
    expect(stdout).toMatch(/Updated: \d{4}-\d{2}-\d{2}T.*\((just now|\d+[mhd] ago|\d+mo ago|\d+y ago|in \d+[mhd]|in \d+mo|in \d+y|in less than 1m)\)/);
    expect(stdout).toContain(draft.id);
    expect(stdout).toContain('pending');
    expect(stdout).toContain('codex');
    expect(stdout).toContain('Project: proj');
    expect(stdout).toContain('Title: Refined CLI draft list');
    expect(stdout).toContain('Metrics: 2 files · +42 -7');
    expect(stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain(`  1. agentfeed preview --id ${draft.id}`);
    expect(stdout).toContain(`  2. agentfeed publish --id ${draft.id} --yes`);
  });

  it('wraps long draft metrics in narrow terminals', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Long metrics draft';
    draft.worklog.metrics.files_changed = 23;
    draft.worklog.metrics.lines_added = 1495;
    draft.worklog.metrics.lines_removed = 164;
    draft.worklog.metrics.tests_run = 150;
    draft.worklog.metrics.tool_calls = 1295;
    draft.worklog.metrics.tokens_used = 2_620_000_000;
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['drafts'], { COLUMNS: '56', AGENTFEED_PLAIN: '1' });

    expect(stderr).toBe('');
    const lines = stdout.split(/\r?\n/);
    const metricsIndex = lines.findIndex((line) => line.startsWith('  Metrics:'));
    expect(metricsIndex).toBeGreaterThanOrEqual(0);
    expect(lines[metricsIndex + 1]).toMatch(/^           calls · 2\.62B tokens$/);
    expect(lines.filter((line) => line.length > 80)).toEqual([]);
  });

  it('prints machine-readable empty draft next actions without human headings', async () => {
    const { stdout, stderr } = await runCli(['drafts', '--json']);
    const output: DraftListJsonOutput = JSON.parse(stdout);

    expect(stderr).toBe('');
    expect(output.summary).toEqual({ total: 0, valid: 0, invalid: 0, pending: 0, uploaded: 0 });
    expect(output.drafts).toEqual([]);
    expect(output.next_actions).toEqual(['agentfeed collect --explain', 'agentfeed share --dry']);
    expect(stdout).not.toContain('AgentFeed drafts');
    expect(stdout).not.toContain('Next');
  });

  it('prints machine-readable draft summaries with next actions and without human headings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.title = 'JSON draft list';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_json_list',
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_json_list/review'
    };
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['drafts', '--json']);
    const output: DraftListJsonOutput = JSON.parse(stdout);

    expect(stderr).toBe('');
    expect(output.summary).toMatchObject({ total: 1, pending: 0, uploaded: 1, invalid: 0 });
    expect(output.drafts).toHaveLength(1);
    expect(output.drafts?.[0]).toMatchObject({
      id: draft.id,
      status: 'uploaded',
      title: 'JSON draft list',
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_json_list/review'
    });
    expect(output.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed open --id ${draft.id}`
    ]);
    expect(stdout).not.toContain('AgentFeed drafts');
    expect(stdout).not.toContain('Next');
  });

});
