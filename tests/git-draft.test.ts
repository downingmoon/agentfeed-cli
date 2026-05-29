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

  it('respects include_file_stats=false when creating public draft fields', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.include_file_stats = false;
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed\nthree\nfour\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });
    const payload = draftToIngestRequest(draft);
    const markdown = await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.md`), 'utf8');

    expect(draft.worklog.metrics.files_changed).toBeNull();
    expect(draft.worklog.metrics.lines_added).toBeNull();
    expect(draft.worklog.metrics.lines_removed).toBeNull();
    expect(draft.worklog.summary).not.toContain('changed 0 files');
    expect(markdown).toContain('- Files changed: Unknown');
    expect(markdown).toContain('- Lines: Unknown');
    expect(markdown).not.toContain('- Files changed: 0');
    expect(payload.worklog.metrics.files_changed).toBeNull();
    expect(payload.worklog.metrics.lines_added).toBeNull();
    expect(payload.worklog.metrics.lines_removed).toBeNull();
  });

  it('prefers a detected enabled agent for git-only auto collection', async () => {
    await mkdir(join(dir, '.omx', 'state'), { recursive: true });
    await initProject({ cwd: dir, noGitCheck: false });
    execFileSync('git', ['add', '.omx', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'agentfeed codex config'], { cwd: dir, stdio: 'ignore' });
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed by codex\nthree\n');

    const draft = await collectDraft({ cwd: dir });

    expect(draft.worklog.agent).toBe('codex');
    expect(draft.source.agent).toBe('codex');
    expect(draft.worklog.metrics.collection_quality).toBeNull();
  });

  it('runs the configured test command when run_tests_on_collect is true', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-pass.mjs';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'test-pass.mjs'), 'process.exit(0);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });

    expect(draft.worklog.metrics.tests_run).toBe(1);
    expect(draft.worklog.metrics.tests_passed).toBe(1);
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBeNull();
  });

  it('records configured test command failures without uploading raw output', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-fail.mjs';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'test-fail.mjs'), 'console.error("SECRET_RAW_TEST_OUTPUT"); process.exit(1);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });
    const payloadText = JSON.stringify(draftToIngestRequest(draft));

    expect(draft.worklog.metrics.tests_run).toBe(1);
    expect(draft.worklog.metrics.tests_passed).toBe(0);
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBe(1);
    expect(payloadText).not.toContain('SECRET_RAW_TEST_OUTPUT');
  });

  it('infers npm test when run_tests_on_collect uses auto command detection', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'auto';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node .agentfeed/test-auto.mjs' } }, null, 2));
    await writeFile(join(dir, '.agentfeed', 'test-auto.mjs'), 'process.exit(0);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });

    expect(draft.worklog.metrics.tests_run).toBe(1);
    expect(draft.worklog.metrics.tests_passed).toBe(1);
    expect(draft.worklog.metrics.commands_run).toBe(1);
  });

  it('records configured build command failures as command metrics without counting them as tests', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-pass.mjs';
    config.commands.build = 'node .agentfeed/build-fail.mjs';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'test-pass.mjs'), 'process.exit(0);\n');
    await writeFile(join(dir, '.agentfeed', 'build-fail.mjs'), 'console.error("SECRET_RAW_BUILD_OUTPUT"); process.exit(1);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });
    const payloadText = JSON.stringify(draftToIngestRequest(draft));

    expect(draft.worklog.metrics.tests_run).toBe(1);
    expect(draft.worklog.metrics.tests_passed).toBe(1);
    expect(draft.worklog.metrics.commands_run).toBe(2);
    expect(draft.worklog.metrics.failed_commands).toBe(1);
    expect(payloadText).not.toContain('SECRET_RAW_BUILD_OUTPUT');
  });

  it('infers npm build when run_tests_on_collect uses auto build detection', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = null;
    config.commands.build = 'auto';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'node .agentfeed/build-auto.mjs' } }, null, 2));
    await writeFile(join(dir, '.agentfeed', 'build-auto.mjs'), 'process.exit(0);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });

    expect(draft.worklog.metrics.tests_run).toBeNull();
    expect(draft.worklog.metrics.tests_passed).toBeNull();
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBeNull();
  });
});
