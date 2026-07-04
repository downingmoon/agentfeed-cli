import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { buildClaudeCodeStopHookCommand, installClaudeCodeHook, uninstallClaudeCodeHook } from '../src/hooks/claude-code-settings.js';
import { pathExists } from '../src/utils/fs.js';

const execFileAsync = promisify(execFile);

let dir: string;

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

describe('Claude Code hook installer', () => {
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

    await expect(installClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings could not be parsed.*settings\.json.*rerun agentfeed hook uninstall claude-code/s);
  });

  it('rejects non-object Claude settings instead of replacing user configuration shape', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, '[]\n');

    await expect(installClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings must be a JSON object.*settings\.json/s);
    expect(await readFile(settings, 'utf8')).toBe('[]\n');
  });

  it('installs a Stop hook command that logs collection failures but exits successfully', async () => {
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-fake-bin-'));
    const fakeAgentFeed = join(binDir, 'agentfeed');
    await writeFile(fakeAgentFeed, [
      '#!/usr/bin/env sh',
      'echo "fake stdout: attempted $*"',
      'test -z "$AGENTFEED_TOKEN" || echo "leaked token: $AGENTFEED_TOKEN"',
      'test -z "$NPM_TOKEN" || echo "leaked npm: $NPM_TOKEN"',
      'test -z "$session_token" || echo "leaked lowercase session: $session_token"',
      'echo "fake stderr: uninitialized project" >&2',
      'exit 42',
      ''
    ].join('\n'));
    await chmod(fakeAgentFeed, 0o755);
    const previousLowercaseSession = process.env.session_token;

    try {
      process.env.session_token = 'lower_hook_secret_should_not_leak';
      const command = buildClaudeCodeStopHookCommand({ agentfeedCommand: `'${fakeAgentFeed}' collect --source claude-code` });
      const result = await execFileAsync('sh', ['-c', command], {
        cwd: dir,
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_hook_secret_should_not_leak',
          NPM_TOKEN: 'npm_hook_secret_should_not_leak',
          session_token: 'lower_hook_secret_should_not_leak',
        }
      });

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
      const log = await readFile(join(dir, '.agentfeed', 'logs', 'hook.log'), 'utf8');
      expect(log).toContain('agentfeed Claude Code Stop hook start');
      expect(log).toContain('fake stdout: attempted collect --source claude-code');
      expect(log).toContain('fake stderr: uninitialized project');
      expect(log).toContain('failed with exit 42');
      expect(log).not.toContain('af_live_hook_secret_should_not_leak');
      expect(log).not.toContain('npm_hook_secret_should_not_leak');
      expect(log).not.toContain('lower_hook_secret_should_not_leak');
    } finally {
      if (previousLowercaseSession === undefined) delete process.env.session_token;
      else process.env.session_token = previousLowercaseSession;
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('installs Stop hook into empty settings, preserves settings, avoids duplicates, and uninstalls only AgentFeed hook', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({ theme: 'dark', hooks: { Stop: [{ matcher: '*', hooks: [{ type: 'command', command: 'echo keep' }] }] } }, null, 2));

    await installClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    await installClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    const installedSettings = parseJsonObject(await readFile(settings, 'utf8'));
    expect(installedSettings.theme).toBe('dark');
    const installedHookJson = JSON.stringify(installedSettings);
    expect(installedHookJson.match(/collect --source claude-code/g)?.length).toBe(1);
    expect(installedHookJson).not.toContain('agentfeed collect --source claude-code');
    expect(installedHookJson).toContain('agentfeed Claude Code Stop hook');
    expect(installedHookJson).toContain('echo keep');

    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    const uninstalledSettings = parseJsonObject(await readFile(settings, 'utf8'));
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

    await installClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    const installedSettings = parseJsonObject(await readFile(settings, 'utf8'));
    const installedCommands = stopHookCommands(installedSettings);
    expect(installedCommands).toContain(unrelatedCommand);
    expect(installedCommands).toContain(buildClaudeCodeStopHookCommand());

    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    const uninstalledSettings = parseJsonObject(await readFile(settings, 'utf8'));
    const uninstalledCommands = stopHookCommands(uninstalledSettings);
    expect(uninstalledCommands).toContain(unrelatedCommand);
    expect(uninstalledCommands).not.toContain(buildClaudeCodeStopHookCommand());
  });
});
