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

interface OpenJsonOutput {
  readonly draft_id?: string;
  readonly review_url?: string;
  readonly opened?: boolean;
  readonly warnings?: readonly string[];
  readonly next_actions?: readonly string[];
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-drafts-open-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(
  args: readonly string[],
  extraEnv: NodeJS.ProcessEnv = {}
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1', AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1', ...extraEnv }
  });
}

async function runCliFailure(args: readonly string[]): Promise<{ readonly stdout: string; readonly stderr: string }> {
  try {
    await runCli(args);
  } catch (error) {
    if (!isCliFailure(error)) throw error;
    return { stdout: textOutput(error.stdout), stderr: textOutput(error.stderr) };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

async function waitForMtimeTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('draft open CLI command', () => {
  it('opens the newest uploaded draft when a newer local draft is still pending', async () => {
    const uploaded = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    uploaded.id = 'draft_uploaded_open';
    uploaded.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_open',
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_uploaded_open/review',
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
    expect(stdout).toContain('https://agentfeed.downingmoon.dev/worklogs/worklog_uploaded_open/review');
    expect(stdout).not.toContain('Draft: draft_pending_newer');
  });

  it('opens saved default review URLs even when the current API env URL is invalid', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_open_invalid_env';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_open_invalid_env',
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_open_invalid_env/review',
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
    expect(stdout).toContain('https://agentfeed.downingmoon.dev/worklogs/worklog_open_invalid_env/review');
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
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_open_json/review',
      uploaded_at: '2026-06-06T00:00:00.000Z'
    };
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['open', '--id', draft.id, '--json']);
    const output: OpenJsonOutput = JSON.parse(stdout);

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      draft_id: draft.id,
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_open_json/review',
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

  it('guides create and publish when opening before any draft exists', async () => {
    const { stdout, stderr } = await runCliFailure(['open', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('No uploaded review drafts found.');
    expect(stderr).toContain('Create and review a draft first:');
    expect(stderr).toContain('Run: agentfeed share --dry');
    expect(stderr).toContain('Run: agentfeed publish --latest --yes');
    expect(stderr).toContain('Or inspect saved drafts:');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).not.toContain('No local drafts found.');
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
