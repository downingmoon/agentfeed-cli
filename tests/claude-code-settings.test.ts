import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { uninstallClaudeCodeHook } from '../src/hooks/claude-code-settings.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-claude-settings-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('Claude Code legacy hook cleanup boundary', () => {
  it('rejects non-object hooks instead of mutating user settings shape', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({ theme: 'dark', hooks: [] }, null, 2));

    await expect(uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings hooks must be a JSON object.*settings\.json/s);
    expect(await readFile(settings, 'utf8')).toBe(JSON.stringify({ theme: 'dark', hooks: [] }, null, 2));
  });

  it('rejects non-array Stop hooks instead of replacing user hook configuration', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({ hooks: { Stop: { matcher: '*', hooks: [] } } }, null, 2));

    await expect(uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings hooks\.Stop must be an array.*settings\.json/s);
    expect(await readFile(settings, 'utf8')).toBe(JSON.stringify({ hooks: { Stop: { matcher: '*', hooks: [] } } }, null, 2));
  });
});
