import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectGitMetrics } from '../src/collectors/git.js';
import { collectDraft } from '../src/draft/create.js';
import { findLatestDraft, readDraft } from '../src/draft/read.js';
import { draftToIngestRequest } from '../src/api/client.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-git-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo\nthree\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('git collector and drafts', () => {
  it('detects changed files and line counts', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed\nthree\nfour\n');
    const metrics = await collectGitMetrics(dir);
    expect(metrics.dirty).toBe(true);
    expect(metrics.files_changed).toBe(1);
    expect(metrics.lines_added).toBeGreaterThanOrEqual(1);
    expect(metrics.lines_removed).toBeGreaterThanOrEqual(1);
  });

  it('handles non-git directory gracefully', async () => {
    const nongit = await mkdtemp(join(tmpdir(), 'agentfeed-nongit-'));
    const metrics = await collectGitMetrics(nongit);
    expect(metrics.dirty).toBe(false);
    expect(metrics.files_changed).toBe(0);
    await rm(nongit, { recursive: true, force: true });
  });

  it('collect creates JSON and Markdown draft and upload payload hides raw file paths', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed\nthree\nfour\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });
    const latest = await findLatestDraft(dir);
    expect(latest?.id).toBe(draft.id);
    await expect(readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.md`), 'utf8')).resolves.toContain('## Metrics');
    await expect(readDraft(dir, draft.id)).resolves.toMatchObject({ id: draft.id, schema_version: '0.2' });

    const payload = draftToIngestRequest(draft);
    const payloadText = JSON.stringify(payload);
    expect(payload.worklog.changed_areas).toContain('API layer');
    expect(payloadText).not.toContain('src/api.ts');
  });
});
