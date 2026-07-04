import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { uninstallClaudeCodeHook } from '../src/hooks/claude-code-settings.js';
import { pathExists } from '../src/utils/fs.js';

let dir: string;
const legacyHookCommand = 'sh -c \'printf "agentfeed Claude Code Stop hook"; agentfeed collect --source claude-code\'';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error('Claude settings must be a JSON object');
  return parsed;
}

type HookCommand = { readonly command: string };
type StopHookEntry = { readonly hooks: readonly HookCommand[] };

function isHookCommand(value: unknown): value is HookCommand {
  return isRecord(value) && typeof value.command === 'string';
}

function isStopHookEntry(value: unknown): value is StopHookEntry {
  return isRecord(value) && Array.isArray(value.hooks) && value.hooks.every(isHookCommand);
}

function stopHookCommands(settings: unknown): string[] {
  if (!isRecord(settings) || !isRecord(settings.hooks) || !Array.isArray(settings.hooks.Stop)) return [];
  return settings.hooks.Stop.filter(isStopHookEntry).flatMap((entry) => entry.hooks.map((hook) => hook.command));
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-claude-hook-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('Claude Code hook legacy cleanup', () => {
  it('does not create settings.json when uninstalling with no existing Claude config', async () => {
    const settings = join(dir, '.claude', 'settings.json');

    expect(await pathExists(settings)).toBe(false);
    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });

    expect(await pathExists(settings)).toBe(false);
  });

  it('reports malformed settings with legacy cleanup guidance when Claude settings JSON is malformed', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, '{not-json');

    await expect(uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings could not be parsed.*settings\.json.*rerun agentfeed hook uninstall claude-code/s);
  });

  it('rejects non-object Claude settings instead of replacing user configuration shape', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, '[]\n');

    await expect(uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings must be a JSON object.*settings\.json/s);
    expect(await readFile(settings, 'utf8')).toBe('[]\n');
  });

  it('removes only the legacy AgentFeed Stop hook from existing settings', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({
      theme: 'dark',
      hooks: {
        Stop: [
          { matcher: '*', hooks: [{ type: 'command', command: 'echo keep' }] },
          { matcher: '*', hooks: [{ type: 'command', command: legacyHookCommand }] }
        ]
      }
    }, null, 2));

    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    const uninstalledSettings = parseJsonObject(await readFile(settings, 'utf8'));
    expect(uninstalledSettings.theme).toBe('dark');
    expect(JSON.stringify(uninstalledSettings)).not.toContain('collect --source claude-code');
    expect(JSON.stringify(uninstalledSettings)).toContain('echo keep');
  });

  it('does not treat unrelated hook text mentioning agentfeed collect as the AgentFeed hook', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    const unrelatedCommand = 'echo "documentation says agentfeed collect can be run manually"';
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({
      hooks: {
        Stop: [{ matcher: '*', hooks: [{ type: 'command', command: unrelatedCommand }] }]
      }
    }, null, 2));

    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    const uninstalledSettings = parseJsonObject(await readFile(settings, 'utf8'));
    const uninstalledCommands = stopHookCommands(uninstalledSettings);
    expect(uninstalledCommands).toContain(unrelatedCommand);
    expect(uninstalledCommands).not.toContain(legacyHookCommand);
  });
});
