import type { AgentFeedProjectConfig } from '../types.js';

const PROJECT_VISIBILITIES = new Set(['private', 'unlisted', 'public']);
const CLAUDE_HOOK_SCOPES = new Set(['project', 'global']);

function configError(path: string, message: string): Error {
  return new Error(`AgentFeed config is invalid at ${path}: ${message}. Re-run agentfeed init or restore the file from backup.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw configError(path, `${field} must be an object`);
  return value;
}

function requireString(value: unknown, field: string, path: string): string {
  if (typeof value !== 'string') throw configError(path, `${field} must be a string`);
  return value;
}

function requireBoolean(value: unknown, field: string, path: string): boolean {
  if (typeof value !== 'boolean') throw configError(path, `${field} must be a boolean`);
  return value;
}

function requireStringArray(value: unknown, field: string, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw configError(path, `${field} must be an array of strings`);
  }
  return [...value];
}

function optionalStringOrNull(value: unknown, field: string, path: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') throw configError(path, `${field} must be a string or null`);
  return value;
}

function commandOrNull(value: unknown, field: string, path: string): 'auto' | string | null {
  if (value === null || typeof value === 'string') return value;
  throw configError(path, `${field} must be a string or null`);
}

export function validateProjectConfig(value: unknown, path: string): AgentFeedProjectConfig {
  const root = requireRecord(value, 'root', path);
  if (!('version' in root)) throw configError(path, 'version must be "0.2"');
  if (root.version !== '0.2') throw new Error('Unsupported AgentFeed config version.');

  const project = requireRecord(root.project, 'project', path);
  const visibility = requireString(project.visibility, 'project.visibility', path);
  if (!PROJECT_VISIBILITIES.has(visibility)) {
    throw configError(path, 'project.visibility must be "private", "unlisted", or "public"');
  }
  const repositoryUrl = optionalStringOrNull(project.repository_url, 'project.repository_url', path);

  const collection = requireRecord(root.collection, 'collection', path);
  const privacy = requireRecord(root.privacy, 'privacy', path);
  const agents = requireRecord(root.agents, 'agents', path);
  const claudeCode = requireRecord(agents.claude_code, 'agents.claude_code', path);
  const claudeHookScope = requireString(claudeCode.hook_scope, 'agents.claude_code.hook_scope', path);
  if (!CLAUDE_HOOK_SCOPES.has(claudeHookScope)) {
    throw configError(path, 'agents.claude_code.hook_scope must be "project" or "global"');
  }
  const codex = requireRecord(agents.codex, 'agents.codex', path);
  const cursor = requireRecord(agents.cursor, 'agents.cursor', path);
  const geminiCli = requireRecord(agents.gemini_cli, 'agents.gemini_cli', path);
  const commands = requireRecord(root.commands, 'commands', path);

  return {
    version: '0.2',
    project: {
      name: requireString(project.name, 'project.name', path),
      slug: requireString(project.slug, 'project.slug', path),
      ...(repositoryUrl === undefined ? {} : { repository_url: repositoryUrl }),
      visibility: visibility as AgentFeedProjectConfig['project']['visibility'],
      tags: requireStringArray(project.tags, 'project.tags', path)
    },
    collection: {
      auto_collect: requireBoolean(collection.auto_collect, 'collection.auto_collect', path),
      auto_upload: requireBoolean(collection.auto_upload, 'collection.auto_upload', path),
      open_review_after_upload: requireBoolean(collection.open_review_after_upload, 'collection.open_review_after_upload', path),
      include_public_prompt: requireBoolean(collection.include_public_prompt, 'collection.include_public_prompt', path),
      include_estimated_cost: requireBoolean(collection.include_estimated_cost, 'collection.include_estimated_cost', path),
      include_token_usage: requireBoolean(collection.include_token_usage, 'collection.include_token_usage', path),
      include_file_stats: requireBoolean(collection.include_file_stats, 'collection.include_file_stats', path),
      include_test_results: requireBoolean(collection.include_test_results, 'collection.include_test_results', path),
      run_tests_on_collect: requireBoolean(collection.run_tests_on_collect, 'collection.run_tests_on_collect', path)
    },
    privacy: {
      redact_secrets: requireBoolean(privacy.redact_secrets, 'privacy.redact_secrets', path),
      redact_emails: requireBoolean(privacy.redact_emails, 'privacy.redact_emails', path),
      redact_private_urls: requireBoolean(privacy.redact_private_urls, 'privacy.redact_private_urls', path),
      redact_local_paths: requireBoolean(privacy.redact_local_paths, 'privacy.redact_local_paths', path),
      block_public_publish_on_high_severity: requireBoolean(privacy.block_public_publish_on_high_severity, 'privacy.block_public_publish_on_high_severity', path),
      raw_transcript_upload: requireBoolean(privacy.raw_transcript_upload, 'privacy.raw_transcript_upload', path),
      raw_diff_upload: requireBoolean(privacy.raw_diff_upload, 'privacy.raw_diff_upload', path)
    },
    agents: {
      claude_code: {
        enabled: requireBoolean(claudeCode.enabled, 'agents.claude_code.enabled', path),
        hook_scope: claudeHookScope as AgentFeedProjectConfig['agents']['claude_code']['hook_scope']
      },
      codex: { enabled: requireBoolean(codex.enabled, 'agents.codex.enabled', path) },
      cursor: { enabled: requireBoolean(cursor.enabled, 'agents.cursor.enabled', path) },
      gemini_cli: { enabled: requireBoolean(geminiCli.enabled, 'agents.gemini_cli.enabled', path) }
    },
    commands: {
      test: commandOrNull(commands.test, 'commands.test', path),
      build: commandOrNull(commands.build, 'commands.build', path)
    }
  };
}
