import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const secret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-scan-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-cli-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('scan CLI command', () => {
  it('shows a safe redaction dry-run report without mutating the draft', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${secret}`;
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'scan',
      '--id',
      draft.id,
      '--dry-run'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));

    expect(stdout).toContain('AgentFeed privacy scan');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain(`Target: draft ${draft.id}`);
    expect(stdout).toContain('Mode: dry run');
    expect(stdout).toContain('Privacy: danger');
    expect(stdout).toContain('Findings: 1');
    expect(stdout).toContain('Result: Sensitive public fields found; review redactions before sharing.');
    expect(stdout).toContain('Dry run: draft not modified.');
    expect(stdout).toContain('Findings detail');
    expect(stdout).toContain('Redacted preview');
    expect(stdout).toContain('[high] api_key_pattern at summary -> [REDACTED_SECRET]');
    expect(stdout).toContain('- summary: Deploy with [REDACTED_SECRET]');
    expect(stdout).toContain('Next');
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
    expect(stdout).not.toContain(secret);
    expect(saved.privacy_scan.status).toBe('safe');
  });

  it('redacts uploadable draft fields when scan is not a dry-run', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${secret}`;
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'scan',
      '--id',
      draft.id
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));

    expect(stdout).toContain(`Target: draft ${draft.id}`);
    expect(stdout).toContain('Mode: redact and save');
    expect(stdout).toContain('Privacy: danger');
    expect(stdout).toContain('- summary: Deploy with [REDACTED_SECRET]');
    expect(stdout).toContain('Next');
    expect(stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
    expect(stdout).not.toContain(secret);
    expect(saved.privacy_scan.status).toBe('danger');
    expect(saved.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
  });

  it('prints a reassuring safe report when no redaction is needed', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = 'Refined CLI output and kept public fields clean.';
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'scan',
      '--id',
      draft.id,
      '--dry-run'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('AgentFeed privacy scan');
    expect(stdout).toContain(`Target: draft ${draft.id}`);
    expect(stdout).toContain('Mode: dry run');
    expect(stdout).toContain('Privacy: safe');
    expect(stdout).toContain('Findings: 0');
    expect(stdout).toContain('Result: No public-field findings detected.');
    expect(stdout).toContain('Findings detail');
    expect(stdout).toContain('No findings detected.');
    expect(stdout).toContain('Redacted preview');
    expect(stdout).toContain('No redactions needed.');
    expect(stdout).toContain('Next');
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });

  it('makes path scans explicit that no draft was modified', async () => {
    const stdout = execFileSync(process.execPath, [
      cliPath,
      'scan',
      '--path',
      dir
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('AgentFeed privacy scan');
    expect(stdout).toContain('Target: path ');
    expect(stdout).toContain('Mode: inspect only');
    expect(stdout).toContain('Path scan: no draft was modified.');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed collect --explain');
  });

  it('keeps scan JSON machine-readable without human UX headings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${secret}`;
    await writeDraft(dir, draft);

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'scan',
      '--id',
      draft.id,
      '--dry-run',
      '--json'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const output = JSON.parse(stdout) as { dry_run?: boolean; scan?: { status?: string } };
    expect(output.dry_run).toBe(true);
    expect(output.scan?.status).toBe('danger');
    expect(stdout).not.toContain('AgentFeed privacy scan');
    expect(stdout).not.toContain('Next');
    expect(stdout).not.toContain('agentfeed scan --id');
  });
});
