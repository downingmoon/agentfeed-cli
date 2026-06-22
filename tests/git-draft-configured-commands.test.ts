import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectDraft, collectDraftWithStatus } from '../src/draft/create.js';
import { draftToIngestRequest } from '../src/api/client.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-git-commands-'));
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

describe('git draft configured command collection', () => {
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
  }, 60_000);

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

  it('warns when auto command inference skips malformed package json', async () => {
    await initProject({ cwd: dir, noGitCheck: false });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'auto';
    config.commands.build = 'auto';
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(join(dir, 'package.json'), '{not-json');

    const result = await collectDraftWithStatus({ cwd: dir, source: 'claude_code', runConfiguredCommands: true });

    expect(result.draft.worklog.metrics.commands_run).toBeNull();
    expect(result.draft.worklog.metrics.tests_run).toBeNull();
    expect(result.warnings.join('\n')).toContain('Could not read package.json while inferring the test command');
    expect(result.warnings.join('\n')).toContain('Could not read package.json while inferring the build command');
    expect(result.warnings.join('\n')).toContain('Fix package.json or configure .agentfeed/config.json commands explicitly.');
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
});
