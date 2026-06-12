import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { runPrivacyScanCommand } from '../src/cli/scan-command.js';

const secret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-scan-command-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('scan command execution helper', () => {
  it('scans a path without mutating any draft state', async () => {
    const srcDir = join(dir, 'src');
    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'feature.ts'), 'export const value = 1;\n', 'utf8');

    const output = await runPrivacyScanCommand({ cwd: dir, path: dir, dryRun: false });

    expect(output.options).toEqual({ dryRun: false, path: dir });
    expect(output.input).toEqual({ changed_areas: [] });
    expect(output.result.scan.status).toBe('safe');
  });

  it('keeps draft scan dry-runs read-only while reporting redactions', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = `Ship with ${secret}`;
    await writeDraft(dir, draft);

    const output = await runPrivacyScanCommand({ cwd: dir, draftId: draft.id, dryRun: true });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8')) as { worklog?: { summary?: string }; privacy_scan?: { status?: string } };

    expect(output.options).toEqual({ dryRun: true, draftId: draft.id });
    expect(output.result.scan.status).toBe('danger');
    expect(output.result.redacted.summary).toBe('Ship with [REDACTED_SECRET]');
    expect(saved.worklog?.summary).toBe(`Ship with ${secret}`);
    expect(saved.privacy_scan?.status).toBe('safe');
  });

  it('writes redacted public fields and privacy scan status for saved draft scans', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = `Ship with ${secret}`;
    await writeDraft(dir, draft);

    const output = await runPrivacyScanCommand({ cwd: dir, draftId: draft.id, dryRun: false });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8')) as { worklog?: { summary?: string }; privacy_scan?: { status?: string } };

    expect(output.options).toEqual({ dryRun: false, draftId: draft.id });
    expect(output.result.scan.status).toBe('danger');
    expect(saved.worklog?.summary).toBe('Ship with [REDACTED_SECRET]');
    expect(saved.privacy_scan?.status).toBe('danger');
  });
});
