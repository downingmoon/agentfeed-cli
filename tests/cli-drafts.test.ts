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

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1' }
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

  it('guides users back to drafts and collect when discarding a missing draft', async () => {
    const { stdout, stderr } = await runCliFailure(['discard', '--id', 'draft_missing']);

    expect(stdout).toBe('');
    expect(stderr).toContain('Draft not found: draft_missing');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).toContain('Run: agentfeed collect --explain');
  });

  it('prints machine-readable draft summaries without human headings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.title = 'JSON draft list';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_json_list',
      review_url: 'https://agentfeed.dev/worklogs/worklog_json_list/review'
    };
    await writeDraft(dir, draft);

    const { stdout, stderr } = await runCli(['drafts', '--json']);
    const output = JSON.parse(stdout) as { drafts?: Array<{ id?: string; status?: string; title?: string; review_url?: string | null }> };

    expect(stderr).toBe('');
    expect(output.drafts).toHaveLength(1);
    expect(output.drafts?.[0]).toMatchObject({
      id: draft.id,
      status: 'uploaded',
      title: 'JSON draft list',
      review_url: 'https://agentfeed.dev/worklogs/worklog_json_list/review'
    });
    expect(stdout).not.toContain('AgentFeed drafts');
    expect(stdout).not.toContain('Next');
  });
});
