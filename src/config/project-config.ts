import { cp } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { cwd as processCwd } from 'node:process';
import type { AgentFeedProjectConfig } from '../types.js';
import { defaultProjectConfig, defaultRedactionRules } from './defaults.js';
import { ensureDir, pathExists, readJson, writeJson } from '../utils/fs.js';
import { run } from '../utils/shell.js';
import { detectAgentSignals } from '../collectors/agent-discovery.js';
import { stripUrlUserInfo } from '../privacy/url.js';

const PROJECT_VISIBILITIES = new Set(['private', 'unlisted', 'public']);
const CLAUDE_HOOK_SCOPES = new Set(['project', 'global']);

function configError(path: string, message: string): Error {
  return new Error(`AgentFeed config is invalid at ${path}: ${message}. Re-run agentfeed init or restore the file from backup.`);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '');
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

function validateProjectConfig(value: unknown, path: string): AgentFeedProjectConfig {
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

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-project';
}

export async function findUp(start: string, name: string): Promise<string | null> {
  let dir = start;
  for (;;) {
    if (await pathExists(join(dir, name))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function findGitRoot(cwd: string): Promise<string | null> {
  const result = await run('git', ['rev-parse', '--show-toplevel'], cwd);
  return result.ok ? result.stdout.trim() || null : null;
}

export async function resolveProjectRoot(cwd = processCwd()): Promise<string> {
  const af = await findUp(cwd, '.agentfeed');
  if (af) return af;
  return (await findGitRoot(cwd)) ?? cwd;
}

export async function loadProjectConfig(cwd = processCwd()): Promise<AgentFeedProjectConfig> {
  const root = await findUp(cwd, '.agentfeed');
  if (!root) throw new Error(await projectNotInitializedMessage(cwd));
  const path = join(root, '.agentfeed', 'config.json');
  let config: unknown;
  try {
    config = await readJson<unknown>(path);
  } catch {
    throw new Error(`AgentFeed config is unreadable or invalid JSON at ${path}. Re-run agentfeed init or restore the file from backup.`);
  }
  return validateProjectConfig(config, path);
}

async function projectNotInitializedMessage(cwd: string): Promise<string> {
  const lines = [
    'AgentFeed project is not initialized.',
    '',
    'Setup',
    'Run: agentfeed init',
    '',
    'Then try',
    'Run: agentfeed status',
    'Run: agentfeed share --dry'
  ];
  if (!await findGitRoot(cwd)) {
    lines.push('');
    lines.push('No Git repository detected');
    lines.push('Run: git init && agentfeed init');
    lines.push('Run: agentfeed init --no-git-check');
  }
  return lines.join('\n');
}

async function backupIfExists(path: string, backupDir: string, name: string): Promise<string | null> {
  if (!(await pathExists(path))) return null;
  await ensureDir(backupDir);
  const backupPath = join(backupDir, `${name}.${timestamp()}.json`);
  await cp(path, backupPath, { force: false });
  return backupPath;
}

export async function initProject(options: { cwd?: string; projectName?: string; noGitCheck?: boolean; force?: boolean } = {}) {
  const cwd = options.cwd ?? processCwd();
  const gitRoot = await findGitRoot(cwd);
  if (!options.noGitCheck && !gitRoot) {
    throw new Error([
      'Not inside a Git repository.',
      'Run: agentfeed init --no-git-check',
      'Or create a git repository first:',
      'Run: git init && agentfeed init'
    ].join('\n'));
  }
  const root = gitRoot ?? cwd;
  const afDir = join(root, '.agentfeed');
  const configPath = join(afDir, 'config.json');
  const redactionRulesPath = join(afDir, 'redaction-rules.json');
  if ((await pathExists(configPath)) && !options.force) {
    let existingConfig: AgentFeedProjectConfig;
    try {
      existingConfig = await loadProjectConfig(root);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error([
        `AgentFeed is already initialized but the config cannot be read at ${configPath}.`,
        reason,
        'Run: agentfeed init --force',
        'Run: agentfeed doctor'
      ].join('\n'));
    }
    return { root, config: existingConfig, alreadyInitialized: true, backupPaths: [] as string[] };
  }

  const repository = await run('git', ['remote', 'get-url', 'origin'], root);
  const name = options.projectName ?? basename(root);
  const config = defaultProjectConfig({ name, slug: slugify(name), repositoryUrl: repository.ok ? stripUrlUserInfo(repository.stdout) : null });
  const signals = await detectAgentSignals({ cwd: root });
  config.agents.claude_code.enabled = signals.claude_code.detected || signals.omc.detected || config.agents.claude_code.enabled;
  config.agents.codex.enabled = signals.codex.detected || signals.omx.detected;
  config.agents.cursor.enabled = signals.cursor.detected;
  config.agents.gemini_cli.enabled = signals.gemini_cli.detected || signals.superpowers.detected;
  await Promise.all(['drafts', 'logs', 'cache', 'backups'].map((d) => ensureDir(join(afDir, d))));
  const backupDir = join(afDir, 'backups');
  const backupPaths = options.force
    ? (await Promise.all([
      backupIfExists(configPath, backupDir, 'config'),
      backupIfExists(redactionRulesPath, backupDir, 'redaction-rules')
    ])).filter((path): path is string => Boolean(path))
    : [];
  await writeJson(configPath, config);
  await writeJson(redactionRulesPath, defaultRedactionRules);
  return { root, config, alreadyInitialized: false, backupPaths };
}
