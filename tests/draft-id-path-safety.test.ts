import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { readDraft } from '../src/draft/read.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-draft-id-'));
  await initProject({ cwd: dir, noGitCheck: true });
  await mkdir(join(dir, '.agentfeed'), { recursive: true });
  await writeFile(join(dir, '.agentfeed', 'credentials.json'), '{"ingestion_token":"af_live_secret"}\n');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('draft id path safety', () => {
  it('rejects path traversal ids when reading drafts', async () => {
    await expect(readDraft(dir, '../credentials')).rejects.toThrow(/Invalid draft id/);
  });

  it('rejects drafts whose embedded id does not match the requested filename', async () => {
    const draft = createEmptyDraft({ projectName: 'Mismatch', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_other';
    await mkdir(join(dir, '.agentfeed', 'drafts'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'drafts', 'draft_requested.json'), `${JSON.stringify(draft, null, 2)}\n`);

    await expect(readDraft(dir, 'draft_requested')).rejects.toThrow(/id must match requested draft id draft_requested/);
  });

  it('does not delete files outside the drafts directory when discarding by id', async () => {
    await expect(execFileAsync(process.execPath, [cliPath, 'discard', '--id', '../credentials'], { cwd: dir }))
      .rejects.toMatchObject({ code: 1 });

    await expect(readFile(join(dir, '.agentfeed', 'credentials.json'), 'utf8'))
      .resolves.toContain('af_live_secret');
  });
});
