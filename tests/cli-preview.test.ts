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

function runPreviewFailure(args: string[]): { stdout: string; stderr: string } {
  try {
    execFileSync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: undefined,
        AGENTFEED_ALLOW_INSECURE_API: undefined
      }
    });
  } catch (error) {
    const failure = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    return {
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? '')
    };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-preview-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('preview CLI command', () => {
  it('guides users when no local draft exists for latest preview', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('No local drafts found.');
    expect(stderr).toContain('Run: agentfeed collect --explain');
    expect(stderr).toContain('Run: agentfeed share --dry');
  });

  it('guides users back to drafts and collect when previewing a missing draft id', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--id', 'draft_missing']);

    expect(stdout).toBe('');
    expect(stderr).toContain('Draft not found: draft_missing');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).toContain('Run: agentfeed collect --explain');
  });

  it('guides login before remote preview when no token is configured', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote preview needs login';
    await writeDraft(dir, draft);

    const { stdout, stderr } = runPreviewFailure(['preview', '--id', draft.id, '--remote']);

    expect(stdout).toBe('');
    expect(stderr).toContain('AgentFeed token is missing.');
    expect(stderr).toContain('Run: agentfeed login');
    expect(stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
  });

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
    expect(stdout).not.toContain('Actions:');
    expect(stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });

  it('points uploaded draft previews at the trusted open workflow first', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Uploaded preview actions';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded_preview',
      review_url: 'https://agentfeed.dev/worklogs/worklog_uploaded_preview/review'
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
    expect(stdout).toContain('Review URL: https://agentfeed.dev/worklogs/worklog_uploaded_preview/review');
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
    const rendered = JSON.parse(stdout);
    expect(rendered.worklog.summary).toBe('Preview should hide [REDACTED_SECRET]');
    expect(rendered.privacy_scan.status).toBe('danger');

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Preview should hide [REDACTED_SECRET]');
  });
});
