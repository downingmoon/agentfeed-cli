import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectDraft } from '../src/draft/create.js';
import {
  restoreEnv,
  snapshotEnv,
  useGitDraftConfiguredCommandsFixture,
  writeConfig,
} from './git-draft-configured-commands-helpers.js';

const fixture = useGitDraftConfiguredCommandsFixture();

describe('git draft configured command safety', () => {
  it('refuses shell-interpreter configured commands even when command execution is explicitly opted in', async () => {
    const { configPath, config } = await fixture.initConfig();
    const markerPath = join(fixture.dir(), '.agentfeed', 'unsafe-command-ran');
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'sh -c "echo unsafe > .agentfeed/unsafe-command-ran"';
    await writeConfig(configPath, config);

    await expect(collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true })).rejects.toThrow(/Refusing to run configured command through a shell interpreter/);
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
  });

  it('refuses shell-interpreter configured commands hidden behind command wrappers', async () => {
    const { configPath, config } = await fixture.initConfig();
    const markerPath = join(fixture.dir(), '.agentfeed', 'unsafe-wrapper-command-ran');
    config.collection.run_tests_on_collect = true;
    const unsafeCommands = [
      'env bash -c "echo unsafe > .agentfeed/unsafe-wrapper-command-ran"',
      'env -u PATH bash -c "echo unsafe > .agentfeed/unsafe-wrapper-command-ran"',
      'env -S "bash -c echo unsafe > .agentfeed/unsafe-wrapper-command-ran"',
      'command sh -c "echo unsafe > .agentfeed/unsafe-wrapper-command-ran"'
    ];

    for (const command of unsafeCommands) {
      config.commands.test = command;
      await writeConfig(configPath, config);
      await expect(collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true }))
        .rejects.toThrow(/Refusing to run configured command through a shell interpreter/);
      await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
    }
  }, 60_000);

  it('does not pass sensitive environment variables to configured commands', async () => {
    const { configPath, config } = await fixture.initConfig();
    const markerPath = join(fixture.dir(), '.agentfeed', 'leaked-env');
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/check-env.mjs';
    await writeConfig(configPath, config);
    await fixture.writeAgentFeedScript('check-env.mjs', [
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
    const snapshot = snapshotEnv([
      'AGENTFEED_TOKEN',
      'PGPASSWORD',
      'DATABASE_URL',
      'REDIS_URL',
      'APP_DATABASE_URL',
      'AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST'
    ]);
    process.env.AGENTFEED_TOKEN = 'af_live_should_not_leak_to_configured_commands';
    process.env.PGPASSWORD = 'postgres-password-should-not-leak';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
    process.env.REDIS_URL = 'redis://:pass@localhost:6379/0';
    process.env.APP_DATABASE_URL = 'postgres://app:pass@localhost/app';
    delete process.env.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST;
    try {
      const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });

      expect(draft.worklog.metrics.tests_run).toBe(1);
      expect(draft.worklog.metrics.tests_passed).toBe(1);
      expect(draft.worklog.metrics.commands_run).toBe(1);
      await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
    } finally {
      restoreEnv(snapshot);
    }
  });
});
