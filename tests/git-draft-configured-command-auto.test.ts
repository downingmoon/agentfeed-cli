import { describe, expect, it } from 'vitest';
import { collectDraft, collectDraftWithStatus } from '../src/draft/create.js';
import { draftToIngestRequest } from '../src/api/client.js';
import {
  useGitDraftConfiguredCommandsFixture,
  writeConfig,
} from './git-draft-configured-commands-helpers.js';

const fixture = useGitDraftConfiguredCommandsFixture();

describe('git draft configured command auto inference', () => {
  it('infers npm test when run_tests_on_collect uses auto command detection', async () => {
    const { configPath, config } = await fixture.initConfig();
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'auto';
    await writeConfig(configPath, config);
    await fixture.writePackageJson({ test: 'node .agentfeed/test-auto.mjs' });
    await fixture.writeAgentFeedScript('test-auto.mjs', 'console.log("5 passed"); process.exit(0);\n');

    const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });

    expect(draft.worklog.metrics.tests_run).toBe(5);
    expect(draft.worklog.metrics.tests_passed).toBe(5);
    expect(draft.worklog.metrics.commands_run).toBe(1);
  });

  it('warns when auto command inference skips malformed package json', async () => {
    const { configPath, config } = await fixture.initConfig();
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'auto';
    config.commands.build = 'auto';
    await writeConfig(configPath, config);
    await fixture.writePackageJson('{not-json');

    const result = await collectDraftWithStatus({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });

    expect(result.draft.worklog.metrics.commands_run).toBeNull();
    expect(result.draft.worklog.metrics.tests_run).toBeNull();
    expect(result.warnings.join('\n')).toContain('Could not read package.json while inferring the test command');
    expect(result.warnings.join('\n')).toContain('Could not read package.json while inferring the build command');
    expect(result.warnings.join('\n')).toContain('Fix package.json or configure .agentfeed/config.json commands explicitly.');
  });

  it('records configured build command failures as command metrics without counting them as tests', async () => {
    const { configPath, config } = await fixture.initConfig();
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-pass.mjs';
    config.commands.build = 'node .agentfeed/build-fail.mjs';
    await writeConfig(configPath, config);
    await fixture.writeAgentFeedScript('test-pass.mjs', 'console.log("1 passed"); process.exit(0);\n');
    await fixture.writeAgentFeedScript('build-fail.mjs', 'console.error("SECRET_RAW_BUILD_OUTPUT"); process.exit(1);\n');

    const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });
    const payloadText = JSON.stringify(draftToIngestRequest(draft));

    expect(draft.worklog.metrics.tests_run).toBe(1);
    expect(draft.worklog.metrics.tests_passed).toBe(1);
    expect(draft.worklog.metrics.commands_run).toBe(2);
    expect(draft.worklog.metrics.failed_commands).toBe(1);
    expect(payloadText).not.toContain('SECRET_RAW_BUILD_OUTPUT');
  });

  it('infers npm build when run_tests_on_collect uses auto build detection', async () => {
    const { configPath, config } = await fixture.initConfig();
    config.collection.run_tests_on_collect = true;
    config.commands.test = null;
    config.commands.build = 'auto';
    await writeConfig(configPath, config);
    await fixture.writePackageJson({ build: 'node .agentfeed/build-auto.mjs' });
    await fixture.writeAgentFeedScript('build-auto.mjs', 'process.exit(0);\n');

    const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });

    expect(draft.worklog.metrics.tests_run).toBeNull();
    expect(draft.worklog.metrics.tests_passed).toBeNull();
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBeNull();
  });
});
