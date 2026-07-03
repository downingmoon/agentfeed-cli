import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectConfiguredCommandMetrics } from '../src/collectors/test-command.js';
import type { AgentFeedProjectConfig } from '../src/types.js';

function configWithCommands(commands: AgentFeedProjectConfig['commands']): AgentFeedProjectConfig {
  return {
    version: '0.2',
    project: { name: 'test', slug: 'test', repository_url: null, visibility: 'private', tags: [] },
    collection: {
      auto_collect: false,
      auto_upload: false,
      open_review_after_upload: false,
      include_public_prompt: false,
      include_estimated_cost: false,
      include_token_usage: false,
      include_file_stats: true,
      include_test_results: true,
      run_tests_on_collect: true
    },
    privacy: {
      redact_secrets: true,
      redact_emails: true,
      redact_private_urls: true,
      redact_local_paths: true,
      block_public_publish_on_high_severity: true,
      raw_transcript_upload: false,
      raw_diff_upload: false
    },
    agents: {
      claude_code: { enabled: true, hook_scope: 'project' },
      codex: { enabled: true },
      cursor: { enabled: false },
      gemini_cli: { enabled: true }
    },
    commands
  };
}

describe('configured command metrics collector', () => {
  it('fails closed and continues when a configured command reaches the bounded timeout', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-command-timeout-'));
    const previousTimeout = process.env.AGENTFEED_COMMAND_TIMEOUT_MS;
    process.env.AGENTFEED_COMMAND_TIMEOUT_MS = '500';
    const startedAt = Date.now();
    try {
      const metrics = await collectConfiguredCommandMetrics(dir, configWithCommands({
        test: `"${process.execPath}" -e "setTimeout(() => {}, 5000)"`,
        build: `"${process.execPath}" -e "console.log('build ok')"`
      }));

      expect(Date.now() - startedAt).toBeLessThan(2_000);
      expect(metrics).toEqual({
        tests_run: null,
        tests_passed: null,
        failed_commands: 1,
        commands_run: 2
      });
    } finally {
      if (previousTimeout === undefined) delete process.env.AGENTFEED_COMMAND_TIMEOUT_MS;
      else process.env.AGENTFEED_COMMAND_TIMEOUT_MS = previousTimeout;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
