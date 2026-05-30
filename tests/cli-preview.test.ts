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
