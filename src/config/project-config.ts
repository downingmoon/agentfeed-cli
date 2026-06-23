import { cp } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { cwd as processCwd } from 'node:process';
import type { AgentFeedProjectConfig } from '../types.js';
import { defaultProjectConfig, defaultRedactionRules } from './defaults.js';
import { ensureDir, pathExists, readJson, writeJson } from '../utils/fs.js';
import { run } from '../utils/shell.js';
import { detectAgentSignals } from '../collectors/agent-discovery.js';
import { stripUrlUserInfo } from '../privacy/url.js';
import { validateProjectConfig } from './project-config-validation.js';

function timestamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '');
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
