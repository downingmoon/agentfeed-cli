import { basename, dirname, join } from 'node:path';
import { cwd as processCwd } from 'node:process';
import type { AgentFeedProjectConfig } from '../types.js';
import { defaultProjectConfig, defaultRedactionRules } from './defaults.js';
import { ensureDir, pathExists, readJson, writeJson } from '../utils/fs.js';
import { run } from '../utils/shell.js';
import { detectAgentSignals } from '../collectors/agent-discovery.js';
import { stripUrlUserInfo } from '../privacy/url.js';

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
  if (!root) throw new Error('AgentFeed project is not initialized. Run: agentfeed init');
  const path = join(root, '.agentfeed', 'config.json');
  let config: AgentFeedProjectConfig;
  try {
    config = await readJson<AgentFeedProjectConfig>(path);
  } catch {
    throw new Error(`AgentFeed config is unreadable or invalid JSON at ${path}. Re-run agentfeed init or restore the file from backup.`);
  }
  if (config.version !== '0.2') throw new Error('Unsupported AgentFeed config version.');
  return config;
}

export async function initProject(options: { cwd?: string; projectName?: string; noGitCheck?: boolean } = {}) {
  const cwd = options.cwd ?? processCwd();
  const gitRoot = await findGitRoot(cwd);
  if (!options.noGitCheck && !gitRoot) throw new Error('Not inside a Git repository. Use --no-git-check to initialize anyway.');
  const root = gitRoot ?? cwd;
  const repository = await run('git', ['remote', 'get-url', 'origin'], root);
  const name = options.projectName ?? basename(root);
  const config = defaultProjectConfig({ name, slug: slugify(name), repositoryUrl: repository.ok ? stripUrlUserInfo(repository.stdout) : null });
  const signals = await detectAgentSignals({ cwd: root });
  config.agents.claude_code.enabled = signals.claude_code.detected || signals.omc.detected || config.agents.claude_code.enabled;
  config.agents.codex.enabled = signals.codex.detected || signals.omx.detected;
  config.agents.cursor.enabled = signals.cursor.detected;
  config.agents.gemini_cli.enabled = signals.gemini_cli.detected || signals.superpowers.detected;
  const afDir = join(root, '.agentfeed');
  await Promise.all(['drafts', 'logs', 'cache', 'backups'].map((d) => ensureDir(join(afDir, d))));
  await writeJson(join(afDir, 'config.json'), config);
  await writeJson(join(afDir, 'redaction-rules.json'), defaultRedactionRules);
  return { root, config };
}
