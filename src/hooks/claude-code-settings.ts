import { cp, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globalAgentFeedDir, homeDir } from '../config/credentials.js';
import { ensureDir, pathExists, writeJson } from '../utils/fs.js';
import { sensitiveEnvironmentNames } from '../utils/subprocess-env.js';

type JsonObj = Record<string, unknown>;
const AGENTFEED_HOOK_ARGS = 'collect --source claude-code';
const AGENTFEED_HOOK_MARKER = 'agentfeed Claude Code Stop hook';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function shellUnsetSensitiveEnvironment(): string {
  return sensitiveEnvironmentNames().map((name) => `unset ${name}; `).join('');
}

function buildDefaultAgentFeedHookInvocation(): string {
  const entry = process.argv[1];
  if (entry && entry !== '-') {
    return `${shellQuote(process.execPath)} ${shellQuote(resolve(entry))} ${AGENTFEED_HOOK_ARGS}`;
  }
  const moduleRelativeCliEntry = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'index.js');
  return `${shellQuote(process.execPath)} ${shellQuote(moduleRelativeCliEntry)} ${AGENTFEED_HOOK_ARGS}`;
}

function buildClaudeCodeStopHookScript(agentfeedCommand: string): string {
  return [
    "LOG_DIR=.agentfeed/logs; ",
    "LOG_FILE=$LOG_DIR/hook.log; ",
    "mkdir -p \"$LOG_DIR\" >/dev/null 2>&1; ",
    "{ ",
    `printf "\\n[%s] ${AGENTFEED_HOOK_MARKER} start\\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)"; `,
    `${shellUnsetSensitiveEnvironment()}${agentfeedCommand}; `,
    "status=$?; ",
    "if [ $status -eq 0 ]; then ",
    `printf "[%s] ${AGENTFEED_HOOK_MARKER} succeeded\\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)"; `,
    "else ",
    `printf "[%s] ${AGENTFEED_HOOK_MARKER} failed with exit %s\\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)" "$status"; `,
    "fi; ",
    "} >> \"$LOG_FILE\" 2>&1 || true; ",
  ].join('');
}

export function buildClaudeCodeStopHookCommand(options: { agentfeedCommand?: string } = {}): string {
  return `sh -c ${shellQuote(buildClaudeCodeStopHookScript(options.agentfeedCommand ?? buildDefaultAgentFeedHookInvocation()))}`;
}

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
    throw new Error(`Claude Code settings could not be parsed at ${path}.${reason} Fix the JSON or move the file aside, then rerun agentfeed hook install claude-code.`);
  }
  if (!isJsonObject(parsed)) {
    throw new Error(`Claude Code settings must be a JSON object at ${path}. Fix the file or move it aside, then rerun agentfeed hook install claude-code.`);
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
  return new Error(`Claude Code settings ${field} must be ${shape} at ${path}. Fix the file or move it aside, then rerun agentfeed hook install claude-code.`);
}

function hooksObject(settings: JsonObj, path: string): JsonObj {
  if (settings.hooks === undefined) {
    const hooks: JsonObj = {};
    settings.hooks = hooks;
    return hooks;
  }
  if (!isJsonObject(settings.hooks)) throw settingsShapeError(path, 'hooks', 'a JSON object');
  return settings.hooks;
}

function stopEntries(settings: JsonObj, path: string): unknown[] {
  const hooks = hooksObject(settings, path);
  if (hooks.Stop === undefined) {
    const stop: unknown[] = [];
    hooks.Stop = stop;
    return stop;
  }
  if (!Array.isArray(hooks.Stop)) throw settingsShapeError(path, 'hooks.Stop', 'an array');
  return hooks.Stop;
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

export function hasAgentFeedHook(settings: JsonObj): boolean {
  if (!isJsonObject(settings.hooks)) return false;
  const hooks = settings.hooks.Stop;
  if (!Array.isArray(hooks)) return false;
  return containsAgentFeedCommandHook(hooks);
}

export async function installClaudeCodeHook(options: { projectRoot: string; scope?: 'project' | 'global'; settingsPath?: string; dryRun?: boolean }) {
  const path = resolveClaudeSettingsPath(options);
  const settings = await readSettings(path);
  if (!hasAgentFeedHook(settings)) {
    stopEntries(settings, path).push({ matcher: '*', hooks: [{ type: 'command', command: buildClaudeCodeStopHookCommand() }] });
  }
  if (options.dryRun) return { path, settings, backupPath: null };
  await ensureDir(dirname(path));
  const backupPath = await backupSettings(options.projectRoot, path);
  await writeJson(path, settings);
  return { path, settings, backupPath };
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
  if (!hasAgentFeedHook(settings)) return { path, settings, backupPath: null };
  const backupPath = await backupSettings(options.projectRoot, path);
  if (isJsonObject(settings.hooks) && Array.isArray(settings.hooks.Stop)) {
    settings.hooks.Stop = removeAgentFeedFromStopEntries(settings.hooks.Stop);
  }
  await ensureDir(dirname(path));
  await writeJson(path, settings);
  return { path, settings, backupPath };
}
