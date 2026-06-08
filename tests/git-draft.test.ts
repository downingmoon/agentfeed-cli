import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { chmod, mkdtemp, rm, writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectGitMetrics } from '../src/collectors/git.js';
import { collectDraft } from '../src/draft/create.js';
import { findLatestDraft, readDraft } from '../src/draft/read.js';
import { writeDraft } from '../src/draft/write.js';
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

  it('counts staged file line changes instead of reporting only changed file names', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo staged\nthree\nfour\n');
    execFileSync('git', ['add', 'src/api.ts'], { cwd: dir });

    const metrics = await collectGitMetrics(dir);

    expect(metrics.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified', lines_added: 2, lines_removed: 1 }
    ]);
    expect(metrics.lines_added).toBe(2);
    expect(metrics.lines_removed).toBe(1);
  });

  it('counts untracked text file lines without uploading file contents', async () => {
    await writeFile(join(dir, 'src', 'new-file.ts'), 'export const a = 1;\nexport const b = 2;\n');

    const metrics = await collectGitMetrics(dir);

    expect(metrics.changed_files).toMatchObject([
      { path: 'src/new-file.ts', status: 'added', lines_added: 2, lines_removed: 0 }
    ]);
    expect(metrics.lines_added).toBe(2);
    expect(metrics.lines_removed).toBe(0);
  });

  it('ignores local OS and Obsidian runtime files in git evidence', async () => {
    await mkdir(join(dir, 'obsidian-vault', '.obsidian'), { recursive: true });
    await writeFile(join(dir, '.DS_Store'), 'local finder metadata');
    await writeFile(join(dir, 'src', '.DS_Store'), 'local finder metadata');
    await writeFile(join(dir, 'obsidian-vault', '.obsidian', 'app.json'), '{"alwaysUpdateLinks":true}\n');
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed\nthree\nfour\n');

    const metrics = await collectGitMetrics(dir);

    expect(metrics.changed_files.map((file) => file.path)).toEqual(['src/api.ts']);
    expect(metrics.files_changed).toBe(1);
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

  it('writes draft artifacts with private permissions and tightens existing files', async () => {
    if (process.platform === 'win32') return;
    await initProject({ cwd: dir, noGitCheck: false });
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed\nthree\nfour\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });
    const draftsDir = join(dir, '.agentfeed', 'drafts');
    const jsonPath = join(draftsDir, `${draft.id}.json`);
    const markdownPath = join(draftsDir, `${draft.id}.md`);

    expect((await stat(draftsDir)).mode & 0o777).toBe(0o700);
    expect((await stat(jsonPath)).mode & 0o777).toBe(0o600);
    expect((await stat(markdownPath)).mode & 0o777).toBe(0o600);

    await chmod(jsonPath, 0o644);
    await chmod(markdownPath, 0o644);
    await writeDraft(dir, draft);

    expect((await stat(jsonPath)).mode & 0o777).toBe(0o600);
    expect((await stat(markdownPath)).mode & 0o777).toBe(0o600);
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
  }, 20_000);

  it('does not attribute git-only auto collection to globally detected agent signals', async () => {
    const previousHome = process.env.HOME;
    const previousUserProfile = process.env.USERPROFILE;
    const fakeHome = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;

    try {
      await mkdir(join(fakeHome, '.cursor'), { recursive: true });
      await mkdir(join(fakeHome, '.codex', 'sessions'), { recursive: true });
      await initProject({ cwd: dir, noGitCheck: false });
      execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
      execFileSync('git', ['commit', '-m', 'agentfeed config from global tools'], { cwd: dir, stdio: 'ignore' });
      await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo changed by a human\nthree\n');

      const draft = await collectDraft({ cwd: dir });

      expect(draft.worklog.agent).toBe('other');
      expect(draft.source.agent).toBe('other');
      expect(draft.source.session_id).toBeNull();
      expect(draft.worklog.metrics.collection_quality).toBeNull();
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = previousUserProfile;
      await rm(fakeHome, { recursive: true, force: true });
    }
  });

  it('does not run configured project commands by default during collection', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const markerPath = join(dir, '.agentfeed', 'command-ran');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = `${process.execPath} .agentfeed/write-marker.mjs`;
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'write-marker.mjs'), 'import { writeFileSync } from "node:fs"; writeFileSync(".agentfeed/command-ran", "yes");\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code' });

    expect(draft.worklog.metrics.tests_run).toBeNull();
    expect(draft.worklog.metrics.tests_passed).toBeNull();
    expect(draft.worklog.metrics.commands_run).toBeNull();
    expect(draft.worklog.metrics.failed_commands).toBeNull();
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
  });

  it('runs the configured test command only when explicitly opted in', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-pass.mjs';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'test-pass.mjs'), 'console.log("3 passed"); process.exit(0);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });

    expect(draft.worklog.metrics.tests_run).toBe(3);
    expect(draft.worklog.metrics.tests_passed).toBe(3);
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBeNull();
  });

  it('refuses shell-interpreter configured commands even when command execution is explicitly opted in', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const markerPath = join(dir, '.agentfeed', 'unsafe-command-ran');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'sh -c "echo unsafe > .agentfeed/unsafe-command-ran"';
    await writeFile(configPath, JSON.stringify(config, null, 2));

    await expect(collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true })).rejects.toThrow(/Refusing to run configured command through a shell interpreter/);
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
  });

  it('refuses shell-interpreter configured commands hidden behind command wrappers', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const markerPath = join(dir, '.agentfeed', 'unsafe-wrapper-command-ran');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    const unsafeCommands = [
      'env bash -c "echo unsafe > .agentfeed/unsafe-wrapper-command-ran"',
      'env -u PATH bash -c "echo unsafe > .agentfeed/unsafe-wrapper-command-ran"',
      'env -S "bash -c echo unsafe > .agentfeed/unsafe-wrapper-command-ran"',
      'command sh -c "echo unsafe > .agentfeed/unsafe-wrapper-command-ran"'
    ];

    for (const command of unsafeCommands) {
      config.commands.test = command;
      await writeFile(configPath, JSON.stringify(config, null, 2));
      await expect(collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true }))
        .rejects.toThrow(/Refusing to run configured command through a shell interpreter/);
      await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
    }
  }, 15_000);

  it('does not pass sensitive environment variables to configured commands', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const markerPath = join(dir, '.agentfeed', 'leaked-env');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/check-env.mjs';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'check-env.mjs'), [
      'import { writeFileSync } from "node:fs";',
      'const sensitiveNames = ["AGENTFEED_TOKEN", "PGPASSWORD", "DATABASE_URL", "REDIS_URL", "APP_DATABASE_URL"];',
      'const leaked = sensitiveNames.filter((name) => process.env[name]);',
      'if (leaked.length) {',
      '  writeFileSync(".agentfeed/leaked-env", leaked.join(","));',
      '  process.exit(7);',
      '}',
      'console.log("1 passed");',
      'process.exit(0);',
      ''
    ].join('\n'));
    const previousEnv = {
      AGENTFEED_TOKEN: process.env.AGENTFEED_TOKEN,
      PGPASSWORD: process.env.PGPASSWORD,
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      APP_DATABASE_URL: process.env.APP_DATABASE_URL
    };
    const previousAllowlist = process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST;
    process.env.AGENTFEED_TOKEN = 'af_live_should_not_leak_to_configured_commands';
    process.env.PGPASSWORD = 'postgres-password-should-not-leak';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
    process.env.REDIS_URL = 'redis://:pass@localhost:6379/0';
    process.env.APP_DATABASE_URL = 'postgres://app:pass@localhost/app';
    delete process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST;
    try {
      const draft = await collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });

      expect(draft.worklog.metrics.tests_run).toBe(1);
      expect(draft.worklog.metrics.tests_passed).toBe(1);
      expect(draft.worklog.metrics.commands_run).toBe(1);
      await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
    } finally {
      for (const [name, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      if (previousAllowlist === undefined) delete process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST;
      else process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST = previousAllowlist;
    }
  });

  it('records configured test command failures without uploading raw output', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-fail.mjs';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, '.agentfeed', 'test-fail.mjs'), 'console.error("SECRET_RAW_TEST_OUTPUT"); console.error("2 failed, 4 passed"); process.exit(1);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });
    const payloadText = JSON.stringify(draftToIngestRequest(draft));

    expect(draft.worklog.metrics.tests_run).toBe(6);
    expect(draft.worklog.metrics.tests_passed).toBe(4);
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
    await writeFile(join(dir, '.agentfeed', 'test-auto.mjs'), 'console.log("5 passed"); process.exit(0);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });

    expect(draft.worklog.metrics.tests_run).toBe(5);
    expect(draft.worklog.metrics.tests_passed).toBe(5);
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
    await writeFile(join(dir, '.agentfeed', 'test-pass.mjs'), 'console.log("1 passed"); process.exit(0);\n');
    await writeFile(join(dir, '.agentfeed', 'build-fail.mjs'), 'console.error("SECRET_RAW_BUILD_OUTPUT"); process.exit(1);\n');

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });
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

    const draft = await collectDraft({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });

    expect(draft.worklog.metrics.tests_run).toBeNull();
    expect(draft.worklog.metrics.tests_passed).toBeNull();
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBeNull();
  });
  it('round-trips valid local drafts through runtime validation', async () => {
    await initProject({ cwd: dir, projectName: 'Draft Guard', noGitCheck: false });
    const draft = await collectDraft({ cwd: dir, source: 'codex' });

    const loaded = await readDraft(dir, draft.id);

    expect(loaded).toMatchObject({ id: draft.id, schema_version: '0.2', upload: { uploaded: false } });
    expect(loaded.privacy_scan.findings).toEqual(draft.privacy_scan.findings);
  });

  it('rejects corrupted local draft shapes with actionable field guidance', async () => {
    await initProject({ cwd: dir, projectName: 'Draft Guard', noGitCheck: false });
    const draft = await collectDraft({ cwd: dir, source: 'codex' });
    const draftPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json`);

    const cases: Array<{ name: string; mutate: (draft: Record<string, unknown>) => unknown; expected: RegExp }> = [
      { name: 'missing worklog', mutate: (value) => ({ ...value, worklog: undefined }), expected: /AgentFeed draft is invalid.*worklog must be an object.*agentfeed collect/is },
      { name: 'missing upload', mutate: (value) => ({ ...value, upload: undefined }), expected: /AgentFeed draft is invalid.*upload must be an object.*agentfeed collect/is },
      { name: 'invalid findings', mutate: (value) => ({ ...value, privacy_scan: { status: 'safe', findings: { id: 'not-array' } } }), expected: /AgentFeed draft is invalid.*privacy_scan\.findings must be an array.*agentfeed collect/is },
      { name: 'invalid source created_at', mutate: (value) => ({ ...value, source: { ...(value.source as Record<string, unknown>), created_at: 'not-a-date' } }), expected: /AgentFeed draft is invalid.*source\.created_at must be a valid timestamp.*agentfeed collect/is },
      { name: 'invalid collection window since', mutate: (value) => ({ ...value, source: { ...(value.source as Record<string, unknown>), collection_window: { since: 'not-a-date', until: '2026-06-01T00:00:00.000Z' } } }), expected: /AgentFeed draft is invalid.*source\.collection_window\.since must be a valid timestamp or null.*agentfeed collect/is },
      { name: 'invalid upload uploaded_at', mutate: (value) => ({ ...value, upload: { ...(value.upload as Record<string, unknown>), uploaded_at: 'not-a-date' } }), expected: /AgentFeed draft is invalid.*upload\.uploaded_at must be a valid timestamp or null.*agentfeed collect/is },
    ];

    for (const testCase of cases) {
      await writeFile(draftPath, JSON.stringify(testCase.mutate(draft as unknown as Record<string, unknown>), null, 2));
      await expect(readDraft(dir, draft.id), testCase.name).rejects.toThrow(testCase.expected);
    }
  });

});
