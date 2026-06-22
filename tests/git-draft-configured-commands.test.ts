import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectDraft } from '../src/draft/create.js';
import { draftToIngestRequest } from '../src/api/client.js';
import {
  useGitDraftConfiguredCommandsFixture,
  writeConfig,
} from './git-draft-configured-commands-helpers.js';

const fixture = useGitDraftConfiguredCommandsFixture();

describe('git draft configured command collection', () => {
  it('does not run configured project commands by default during collection', async () => {
    const { configPath, config } = await fixture.initConfig();
    const markerPath = join(fixture.dir(), '.agentfeed', 'command-ran');
    config.collection.run_tests_on_collect = true;
    config.commands.test = `${process.execPath} .agentfeed/write-marker.mjs`;
    await writeConfig(configPath, config);
    await fixture.writeAgentFeedScript('write-marker.mjs', 'import { writeFileSync } from "node:fs"; writeFileSync(".agentfeed/command-ran", "yes");\n');

    const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code' });

    expect(draft.worklog.metrics.tests_run).toBeNull();
    expect(draft.worklog.metrics.tests_passed).toBeNull();
    expect(draft.worklog.metrics.commands_run).toBeNull();
    expect(draft.worklog.metrics.failed_commands).toBeNull();
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
  });

  it('runs the configured test command only when explicitly opted in', async () => {
    const { configPath, config } = await fixture.initConfig();
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-pass.mjs';
    await writeConfig(configPath, config);
    await fixture.writeAgentFeedScript('test-pass.mjs', 'console.log("3 passed"); process.exit(0);\n');

    const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });

    expect(draft.worklog.metrics.tests_run).toBe(3);
    expect(draft.worklog.metrics.tests_passed).toBe(3);
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBeNull();
  });

  it('records configured test command failures without uploading raw output', async () => {
    const { configPath, config } = await fixture.initConfig();
    config.collection.run_tests_on_collect = true;
    config.commands.test = 'node .agentfeed/test-fail.mjs';
    await writeConfig(configPath, config);
    await fixture.writeAgentFeedScript('test-fail.mjs', 'console.error("SECRET_RAW_TEST_OUTPUT"); console.error("2 failed, 4 passed"); process.exit(1);\n');

    const draft = await collectDraft({ cwd: fixture.dir(), source: 'claude_code', runConfiguredCommands: true });
    const payloadText = JSON.stringify(draftToIngestRequest(draft));

    expect(draft.worklog.metrics.tests_run).toBe(6);
    expect(draft.worklog.metrics.tests_passed).toBe(4);
    expect(draft.worklog.metrics.commands_run).toBe(1);
    expect(draft.worklog.metrics.failed_commands).toBe(1);
    expect(payloadText).not.toContain('SECRET_RAW_TEST_OUTPUT');
  });
});
