import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');

let dir: string;
let home: string;

interface PreviewJsonOutput {
  readonly id?: string;
  readonly worklog?: { readonly summary?: string };
  readonly privacy_scan?: { readonly status?: string };
  readonly upload?: { readonly uploaded?: boolean };
  readonly next_actions?: readonly string[];
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-local-preview-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('local preview CLI rendering', () => {
  it('keeps action guidance in human-readable preview output', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Preview actions';
    draft.worklog.summary = 'Preview should keep action guidance.';
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('AgentFeed preview');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Details');
    expect(stdout).toContain(`ID: ${draft.id}`);
    expect(stdout).toContain('Title: Preview actions');
    expect(stdout).toContain('Upload: pending');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).not.toContain('Actions:');
    expect(stdout).toContain(`  1. agentfeed publish --id ${draft.id} --yes`);
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });

  it('wraps long summary and metrics in narrow preview output', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Narrow preview';
    draft.worklog.summary = [
      'This preview summarizes a multi agent implementation pass with enough words to wrap cleanly in narrow terminals.',
      'It should remain readable without producing a single oversized key value line.'
    ].join(' ');
    draft.worklog.metrics = {
      ...draft.worklog.metrics,
      files_changed: 42,
      lines_added: 1234,
      lines_removed: 567,
      tests_run: 999,
      tool_calls: 321,
      tokens_used: 987654
    };
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, COLUMNS: '56', AGENTFEED_PLAIN: '1' }
    });

    const lines = stdout.split(/\r?\n/);
    const summaryIndex = lines.findIndex((line) => line.startsWith('Summary:'));
    expect(summaryIndex).toBeGreaterThanOrEqual(0);
    const summaryEnd = lines.findIndex((line, index) => index > summaryIndex && line === '');
    const summaryLines = lines.slice(summaryIndex, summaryEnd);
    expect(summaryLines.length).toBeGreaterThan(1);
    expect(summaryLines.every((line) => line.length <= 56)).toBe(true);
    expect(summaryLines.slice(1).every((line) => line.startsWith('         '))).toBe(true);

    const metricsIndex = lines.findIndex((line) => line.startsWith('Metrics:'));
    expect(metricsIndex).toBeGreaterThanOrEqual(0);
    const privacyIndex = lines.findIndex((line) => line.startsWith('Privacy:'));
    const metricsLines = lines.slice(metricsIndex, privacyIndex);
    expect(metricsLines.length).toBeGreaterThan(1);
    expect(metricsLines.every((line) => line.length <= 56)).toBe(true);
    expect(metricsLines.slice(1).every((line) => line.startsWith('         '))).toBe(true);
    expect(stdout).toContain('Recommended order:');
  });

  it('points uploaded draft previews at the trusted open workflow first', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Uploaded preview actions';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_preview',
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_uploaded_preview/review'
    };
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('Upload: uploaded');
    expect(stdout).toContain('Review URL:\n  https://agentfeed.downingmoon.dev/worklogs/worklog_uploaded_preview/review');
    expect(stdout).toContain(`agentfeed open --id ${draft.id}`);
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });

  it('redacts public draft fields before rendering JSON output', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = 'Preview should hide sk-abcdefghijklmnopqrstuvwxyz1234567890';
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id,
      '--json'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234567890');
    const rendered: PreviewJsonOutput = JSON.parse(stdout);
    expect(rendered.worklog.summary).toBe('Preview should hide [REDACTED_SECRET]');
    expect(rendered.privacy_scan.status).toBe('danger');
    expect(rendered.next_actions).toEqual([
      `agentfeed publish --id ${draft.id} --yes`,
      `agentfeed scan --id ${draft.id}`
    ]);

    const saved: PreviewJsonOutput = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Preview should hide [REDACTED_SECRET]');
  });

  it('points uploaded draft preview JSON at the trusted open workflow first', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Uploaded preview JSON actions';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_preview_json',
      review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_uploaded_preview_json/review'
    };
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'preview',
      '--id',
      draft.id,
      '--json'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const rendered: PreviewJsonOutput = JSON.parse(stdout);
    expect(rendered.id).toBe(draft.id);
    expect(rendered.upload?.uploaded).toBe(true);
    expect(rendered.next_actions).toEqual([
      `agentfeed open --id ${draft.id}`,
      `agentfeed scan --id ${draft.id}`
    ]);
    expect(stdout).not.toContain('AgentFeed preview');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });
});
