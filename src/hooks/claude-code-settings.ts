import { cp, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homeDir } from '../config/credentials.js';
import { ensureDir, pathExists, writeJson } from '../utils/fs.js';

type JsonObj = Record<string, unknown>;
const AGENTFEED_HOOK_ARGS = 'collect --source claude-code';
const AGENTFEED_HOOK_MARKER = 'agentfeed Claude Code Stop hook';

function timestamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

export function resolveClaudeSettingsPath(options: { projectRoot: string; scope?: 'project' | 'global'; settingsPath?: string }): string {
  if (options.settingsPath) return options.settingsPath;
  return options.scope === 'global' ? join(homeDir(), '.claude', 'settings.json') : join(options.projectRoot, '.claude', 'settings.json');
}

async function readSettings(path: string): Promise<JsonObj> {
  if (!(await pathExists(path))) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
    throw new Error(`Claude Code settings could not be parsed at ${path}.${reason} Fix the JSON or move the file aside, then rerun agentfeed hook uninstall claude-code.`);
  }
  if (!isJsonObject(parsed)) {
    throw new Error(`Claude Code settings must be a JSON object at ${path}. Fix the file or move it aside, then rerun agentfeed hook uninstall claude-code.`);
  }
  return parsed;
}

async function backupSettings(projectRoot: string, path: string): Promise<string | null> {
  if (!(await pathExists(path))) return null;
  const projectBackupDir = join(projectRoot, '.agentfeed', 'backups');
  const backupDir = (await pathExists(join(projectRoot, '.agentfeed'))) ? projectBackupDir : dirname(path);
  await ensureDir(backupDir);
  const backupPath = backupDir === projectBackupDir ? join(backupDir, `claude-settings.${timestamp()}.json`) : `${path}.agentfeed-backup.${timestamp()}`;
  await cp(path, backupPath, { force: false });
  return backupPath;
}

function settingsShapeError(path: string, field: string, shape: string): Error {
  return new Error(`Claude Code settings ${field} must be ${shape} at ${path}. Fix the file or move it aside, then rerun agentfeed hook uninstall claude-code.`);
}

function isJsonObject(value: unknown): value is JsonObj {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isAgentFeedCommandHook(value: unknown): boolean {
  if (!isJsonObject(value)) return false;
  return value.type === 'command'
    && typeof value.command === 'string'
    && value.command.includes(AGENTFEED_HOOK_ARGS)
    && value.command.includes(AGENTFEED_HOOK_MARKER);
}

function containsAgentFeedCommandHook(value: unknown): boolean {
  if (isAgentFeedCommandHook(value)) return true;
  if (Array.isArray(value)) return value.some(containsAgentFeedCommandHook);
  if (!isJsonObject(value)) return false;
  return Object.values(value).some(containsAgentFeedCommandHook);
}

export function hasAgentFeedHook(settings: JsonObj, path = 'Claude Code settings'): boolean {
  if (settings.hooks !== undefined && !isJsonObject(settings.hooks)) throw settingsShapeError(path, 'hooks', 'a JSON object');
  if (!isJsonObject(settings.hooks)) return false;
  const hooks = settings.hooks.Stop;
  if (hooks !== undefined && !Array.isArray(hooks)) throw settingsShapeError(path, 'hooks.Stop', 'an array');
  if (!Array.isArray(hooks)) return false;
  return containsAgentFeedCommandHook(hooks);
}

function removeAgentFeedFromHookList(value: unknown): unknown {
  if (Array.isArray(value)) {
    const retained: unknown[] = [];
    for (const item of value) {
      if (isAgentFeedCommandHook(item)) continue;
      retained.push(isJsonObject(item) || Array.isArray(item) ? removeAgentFeedFromHookList(item) : item);
    }
    return retained;
  }
  if (isJsonObject(value)) {
    const copy: JsonObj = { ...value };
    for (const [key, child] of Object.entries(copy)) copy[key] = removeAgentFeedFromHookList(child);
    return copy;
  }
  return value;
}

function removeAgentFeedFromStopEntries(value: readonly unknown[]): unknown[] {
  const retained: unknown[] = [];
  for (const item of value) {
    if (isAgentFeedCommandHook(item)) continue;
    retained.push(isJsonObject(item) || Array.isArray(item) ? removeAgentFeedFromHookList(item) : item);
  }
  return retained;
}

export async function uninstallClaudeCodeHook(options: { projectRoot: string; scope?: 'project' | 'global'; settingsPath?: string }) {
  const path = resolveClaudeSettingsPath(options);
  if (!(await pathExists(path))) return { path, settings: {}, backupPath: null };
  const settings = await readSettings(path);
  if (!hasAgentFeedHook(settings, path)) return { path, settings, backupPath: null };
  const backupPath = await backupSettings(options.projectRoot, path);
  if (isJsonObject(settings.hooks) && Array.isArray(settings.hooks.Stop)) {
    settings.hooks.Stop = removeAgentFeedFromStopEntries(settings.hooks.Stop);
  }
  await ensureDir(dirname(path));
  await writeJson(path, settings);
  return { path, settings, backupPath };
}
