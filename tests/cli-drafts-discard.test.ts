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

interface DiscardJsonOutput {
  readonly confirmation_required?: boolean;
  readonly deleted?: boolean;
  readonly draft_id?: string;
  readonly files?: {
    readonly json?: { readonly existed?: boolean; readonly will_remove?: boolean; readonly removed?: boolean };
    readonly markdown?: { readonly existed?: boolean; readonly will_remove?: boolean; readonly removed?: boolean };
  };
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-drafts-discard-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: readonly string[]): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1', AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1' }
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

describe('draft discard CLI command', () => {
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
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed drafts');
    expect(stdout).toContain('  2. agentfeed collect --explain');
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
    const output: DiscardJsonOutput = JSON.parse(stdout);

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
    const output: DiscardJsonOutput = JSON.parse(stdout);

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
    expect(stderr).toContain('Inspect saved drafts:');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).toContain('Create a fresh draft:');
    expect(stderr).toContain('Run: agentfeed collect --explain');
  });
});
