import { cp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { globalAgentFeedDir, homeDir } from '../config/credentials.js';
import { ensureDir, pathExists } from '../utils/fs.js';
import { sensitiveEnvironmentNames } from '../utils/subprocess-env.js';

type JsonObj = Record<string, unknown>;
const AGENTFEED_COMMAND = 'agentfeed collect --source claude-code';

function shellUnsetSensitiveEnvironment(): string {
  return sensitiveEnvironmentNames().map((name) => `unset ${name}; `).join('');
}

export function buildClaudeCodeStopHookCommand(): string {
  return [
    "sh -c '",
    "LOG_DIR=.agentfeed/logs; ",
    "LOG_FILE=$LOG_DIR/hook.log; ",
    "mkdir -p \"$LOG_DIR\" >/dev/null 2>&1; ",
    "{ ",
    "printf \"\\n[%s] agentfeed Claude Code Stop hook start\\n\" \"$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)\"; ",
    `${shellUnsetSensitiveEnvironment()}${AGENTFEED_COMMAND}; `,
    "status=$?; ",
    "if [ $status -eq 0 ]; then ",
    "printf \"[%s] agentfeed Claude Code Stop hook succeeded\\n\" \"$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)\"; ",
    "else ",
    "printf \"[%s] agentfeed Claude Code Stop hook failed with exit %s\\n\" \"$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)\" \"$status\"; ",
    "fi; ",
    "} >> \"$LOG_FILE\" 2>&1 || true; ",
    "exit 0'",
  ].join('');
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
  return JSON.parse(await readFile(path, 'utf8')) as JsonObj;
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

function stopEntries(settings: JsonObj): unknown[] {
  const hooks = settings.hooks as JsonObj | undefined;
  if (!hooks) settings.hooks = {};
  const root = settings.hooks as JsonObj;
  if (!Array.isArray(root.Stop)) root.Stop = [];
  return root.Stop as unknown[];
}

function isJsonObject(value: unknown): value is JsonObj {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isAgentFeedCommandHook(value: unknown): boolean {
  if (!isJsonObject(value)) return false;
  return value.type === 'command'
    && typeof value.command === 'string'
    && value.command.includes(AGENTFEED_COMMAND)
    && value.command.includes('agentfeed Claude Code Stop hook');
}

function containsAgentFeedCommandHook(value: unknown): boolean {
  if (isAgentFeedCommandHook(value)) return true;
  if (Array.isArray(value)) return value.some(containsAgentFeedCommandHook);
  if (!isJsonObject(value)) return false;
  return Object.values(value).some(containsAgentFeedCommandHook);
}

export function hasAgentFeedHook(settings: JsonObj): boolean {
  const hooks = (settings.hooks as JsonObj | undefined)?.Stop;
  if (!Array.isArray(hooks)) return false;
  return containsAgentFeedCommandHook(hooks);
}

export async function installClaudeCodeHook(options: { projectRoot: string; scope?: 'project' | 'global'; settingsPath?: string; dryRun?: boolean }) {
  const path = resolveClaudeSettingsPath(options);
  const settings = await readSettings(path);
  if (!hasAgentFeedHook(settings)) {
    stopEntries(settings).push({ matcher: '*', hooks: [{ type: 'command', command: buildClaudeCodeStopHookCommand() }] });
  }
  if (options.dryRun) return { path, settings, backupPath: null };
  await ensureDir(dirname(path));
  const backupPath = await backupSettings(options.projectRoot, path);
  await writeFile(path, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return { path, settings, backupPath };
}

function removeAgentFeedFromHookList(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isJsonObject(item) || Array.isArray(item)) return removeAgentFeedFromHookList(item);
        return item;
      })
      .filter((item) => !isAgentFeedCommandHook(item));
  }
  if (isJsonObject(value)) {
    const copy: JsonObj = { ...(value as JsonObj) };
    for (const [key, child] of Object.entries(copy)) copy[key] = removeAgentFeedFromHookList(child);
    return copy;
  }
  return value;
}

export async function uninstallClaudeCodeHook(options: { projectRoot: string; scope?: 'project' | 'global'; settingsPath?: string }) {
  const path = resolveClaudeSettingsPath(options);
  if (!(await pathExists(path))) return { path, settings: {}, backupPath: null };
  const settings = await readSettings(path);
  if (!hasAgentFeedHook(settings)) return { path, settings, backupPath: null };
  const backupPath = await backupSettings(options.projectRoot, path);
  if (settings.hooks && typeof settings.hooks === 'object') {
    const hooks = settings.hooks as JsonObj;
    hooks.Stop = removeAgentFeedFromHookList(hooks.Stop) as unknown[];
  }
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return { path, settings, backupPath };
}
