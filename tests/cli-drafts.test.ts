import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

async function waitForMtimeTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
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
    expect(stdout).toContain('agentfeed collect --explain');
    expect(stdout).toContain('agentfeed share --dry');
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
    expect(stdout).toContain(draft.id);
    expect(stdout).toContain('pending');
    expect(stdout).toContain('codex');
    expect(stdout).toContain('Project: proj');
    expect(stdout).toContain('Title: Refined CLI draft list');
    expect(stdout).toContain('Metrics: 2 files · +42 -7');
    expect(stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
  });

  it('prints a sectioned discard summary and removes local draft artifacts', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Discard me cleanly';
    const paths = await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['discard', '--id', draft.id, '--yes']);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed draft discarded');
    expect(stdout).toContain(`Discarded draft: ${draft.id}`);
    expect(stdout).toContain('Summary');
    expect(stdout).toContain(`Draft: ${draft.id}`);
    expect(stdout).toContain('JSON: removed');
    expect(stdout).toContain('Markdown: removed');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed drafts');
    expect(stdout).toContain('agentfeed collect --explain');
    expect(existsSync(paths.jsonPath)).toBe(false);
    expect(existsSync(paths.markdownPath)).toBe(false);
  });

  it('requires explicit confirmation before discarding a local draft', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Keep me until confirmed';
    const paths = await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['discard', '--id', draft.id]);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed discard paused');
    expect(stdout).toContain('Discard confirmation required.');
    expect(stdout).toContain('No local draft files were deleted.');
    expect(stdout).toContain(`Draft: ${draft.id}`);
    expect(stdout).toContain('JSON: will be removed');
    expect(stdout).toContain('Markdown: will be removed');
    expect(stdout).toContain(`agentfeed discard --id ${draft.id} --yes`);
    expect(stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(existsSync(paths.jsonPath)).toBe(true);
    expect(existsSync(paths.markdownPath)).toBe(true);
  });

  it('prints machine-readable discard confirmation without deleting draft artifacts', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Keep me in JSON';
    const paths = await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['discard', '--id', draft.id, '--json']);
    const output = JSON.parse(stdout) as {
      confirmation_required?: boolean;
      deleted?: boolean;
      draft_id?: string;
      files?: { json?: { existed?: boolean; will_remove?: boolean; removed?: boolean }; markdown?: { existed?: boolean; will_remove?: boolean; removed?: boolean } };
      next_actions?: string[];
    };

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      confirmation_required: true,
      deleted: false,
      draft_id: draft.id,
      files: {
        json: { existed: true, will_remove: true, removed: false },
        markdown: { existed: true, will_remove: true, removed: false }
      },
      next_actions: [`agentfeed discard --id ${draft.id} --yes`, `agentfeed preview --id ${draft.id}`]
    });
    expect(stdout).not.toContain('AgentFeed discard paused');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
    expect(existsSync(paths.jsonPath)).toBe(true);
    expect(existsSync(paths.markdownPath)).toBe(true);
  });

  it('prints machine-readable discard result and removes local draft artifacts', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Discard me in JSON';
    const paths = await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['discard', '--id', draft.id, '--yes', '--json']);
    const output = JSON.parse(stdout) as {
      confirmation_required?: boolean;
      deleted?: boolean;
      draft_id?: string;
      files?: { json?: { existed?: boolean; removed?: boolean }; markdown?: { existed?: boolean; removed?: boolean } };
      next_actions?: string[];
    };

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      confirmation_required: false,
      deleted: true,
      draft_id: draft.id,
      files: {
        json: { existed: true, removed: true },
        markdown: { existed: true, removed: true }
      },
      next_actions: ['agentfeed drafts', 'agentfeed collect --explain']
    });
    expect(stdout).not.toContain('AgentFeed draft discarded');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
    expect(existsSync(paths.jsonPath)).toBe(false);
    expect(existsSync(paths.markdownPath)).toBe(false);
  });

  it('guides users back to drafts and collect when discarding a missing draft', async () => {
    const { stdout, stderr } = await runCliFailure(['discard', '--id', 'draft_missing']);

    expect(stdout).toBe('');
    expect(stderr).toContain('Draft not found: draft_missing');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).toContain('Run: agentfeed collect --explain');
  });

  it('prints machine-readable empty draft next actions without human headings', async () => {
    const { stdout, stderr } = await runCli(['drafts', '--json']);
    const output = JSON.parse(stdout) as { summary?: { total?: number; pending?: number; uploaded?: number; invalid?: number }; drafts?: unknown[]; next_actions?: string[] };

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
      review_url: 'https://agentfeed.dev/worklogs/worklog_json_list/review'
    };
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['drafts', '--json']);
    const output = JSON.parse(stdout) as { summary?: { total?: number; pending?: number; uploaded?: number; invalid?: number }; drafts?: Array<{ id?: string; status?: string; title?: string; review_url?: string | null }>; next_actions?: string[] };

    expect(stderr).toBe('');
    expect(output.summary).toMatchObject({ total: 1, pending: 0, uploaded: 1, invalid: 0 });
    expect(output.drafts).toHaveLength(1);
    expect(output.drafts?.[0]).toMatchObject({
      id: draft.id,
      status: 'uploaded',
      title: 'JSON draft list',
      review_url: 'https://agentfeed.dev/worklogs/worklog_json_list/review'
    });
    expect(output.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed open --id ${draft.id}`
    ]);
    expect(stdout).not.toContain('AgentFeed drafts');
    expect(stdout).not.toContain('Next');
  });

  it('opens the newest uploaded draft when a newer local draft is still pending', async () => {
    const uploaded = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    uploaded.id = 'draft_uploaded_open';
    uploaded.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_open',
      review_url: 'https://agentfeed.dev/worklogs/worklog_uploaded_open/review',
      uploaded_at: '2026-06-06T00:00:00.000Z'
    };
    await writeDraft(dir, uploaded);
    await waitForMtimeTick();
    const pending = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    pending.id = 'draft_pending_newer';
    await writeDraft(dir, pending);

    const { stdout, stderr } = await runCli(['open', '--latest']);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed review URL');
    expect(stdout).toContain('Browser open failed. Open this URL manually:');
    expect(stdout).toContain('Draft: draft_uploaded_open');
    expect(stdout).toContain('https://agentfeed.dev/worklogs/worklog_uploaded_open/review');
    expect(stdout).not.toContain('Draft: draft_pending_newer');
  });

  it('opens saved default review URLs even when the current API env URL is invalid', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_open_invalid_env';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_open_invalid_env',
      review_url: 'https://agentfeed.dev/worklogs/worklog_open_invalid_env/review',
      uploaded_at: '2026-06-06T00:00:00.000Z'
    };
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['open', '--id', draft.id], {
      AGENTFEED_API_BASE_URL: 'http://203.0.113.10:18080/v1',
      AGENTFEED_ALLOW_INSECURE_API: ''
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed review URL');
    expect(stdout).toContain('Draft: draft_open_invalid_env');
    expect(stdout).toContain('https://agentfeed.dev/worklogs/worklog_open_invalid_env/review');
    expect(stdout).toContain('Warnings');
    expect(stdout).toContain('ignored invalid AgentFeed API URL while opening a saved review URL');
    expect(stdout).toContain('http is allowed only for localhost');
  });

  it('prints machine-readable open fallback when the browser cannot be opened', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_open_json';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_open_json',
      review_url: 'https://agentfeed.dev/worklogs/worklog_open_json/review',
      uploaded_at: '2026-06-06T00:00:00.000Z'
    };
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['open', '--id', draft.id, '--json']);
    const output = JSON.parse(stdout) as {
      draft_id?: string;
      review_url?: string;
      opened?: boolean;
      warnings?: string[];
      next_actions?: string[];
    };

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      draft_id: draft.id,
      review_url: 'https://agentfeed.dev/worklogs/worklog_open_json/review',
      opened: false,
      next_actions: [`agentfeed preview --id ${draft.id}`, 'agentfeed status']
    });
    expect(output.warnings?.join('\n')).toContain('could not be opened');
    expect(stdout).not.toContain('AgentFeed review URL');
    expect(stdout).not.toContain('Browser open failed');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });

  it('guides publish and preview when opening a pending draft by id', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_pending_open';
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCliFailure(['open', '--id', draft.id]);

    expect(stdout).toBe('');
    expect(stderr).toContain(`Draft has not been uploaded yet: ${draft.id}`);
    expect(stderr).toContain(`Run: agentfeed publish --id ${draft.id} --yes`);
    expect(stderr).toContain(`Run: agentfeed preview --id ${draft.id}`);
    expect(stderr).toContain('Run: agentfeed drafts');
  });

  it('guides publishing the newest draft when no uploaded drafts exist', async () => {
    const oldDraft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    oldDraft.id = 'draft_pending_old';
    await writeDraft(dir, oldDraft);
    await waitForMtimeTick();
    const newDraft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    newDraft.id = 'draft_pending_new';
    await writeDraft(dir, newDraft);

    const { stdout, stderr } = await runCliFailure(['open', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('No uploaded local drafts found.');
    expect(stderr).toContain('Newest draft: draft_pending_new');
    expect(stderr).toContain('Run: agentfeed publish --id draft_pending_new --yes');
    expect(stderr).toContain('Run: agentfeed share --yes');
    expect(stderr).toContain('Run: agentfeed drafts');
  });
});
