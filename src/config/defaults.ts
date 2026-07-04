import type { AgentFeedProjectConfig } from '../types.js';

export const DEFAULT_API_BASE_URL = 'https://agentfeed.api.downingmoon.dev/v1';

export function defaultProjectConfig(input: { name: string; slug: string; repositoryUrl?: string | null }): AgentFeedProjectConfig {
  return {
    version: '0.2',
    project: { name: input.name, slug: input.slug, repository_url: input.repositoryUrl ?? null, visibility: 'private', tags: [] },
    collection: {
      auto_collect: true,
      auto_upload: false,
      open_review_after_upload: true,
      include_public_prompt: false,
      include_estimated_cost: false,
      include_token_usage: true,
      include_file_stats: true,
      include_test_results: true,
      run_tests_on_collect: false
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
      claude_code: { enabled: true },
      codex: { enabled: false },
      cursor: { enabled: false },
      gemini_cli: { enabled: false }
    },
    commands: { test: 'auto', build: 'auto' }
  };
}

export const defaultRedactionRules = {
  version: '0.2',
  rules: ['api_key_pattern', 'database_url', 'email_address', 'private_url', 'sensitive_path']
};
