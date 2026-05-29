import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathExists } from '../utils/fs.js';

export type AgentSignalKey = 'claude_code' | 'codex' | 'cursor' | 'gemini_cli' | 'omc' | 'omx' | 'superpowers';

export interface AgentSignal {
  detected: boolean;
  label: string;
  paths: string[];
  guidance: string;
}

export type AgentSignals = Record<AgentSignalKey, AgentSignal>;

async function existing(paths: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const path of paths) {
    if (await pathExists(path).catch(() => false)) found.push(path);
  }
  return found;
}

function signal(label: string, paths: string[], guidance: string): AgentSignal {
  return { detected: paths.length > 0, label, paths, guidance };
}

export async function detectAgentSignals(options: { cwd: string; home?: string }): Promise<AgentSignals> {
  const home = options.home ?? homedir();
  const cwd = options.cwd;
  const claude = await existing([join(home, '.claude', 'projects'), join(cwd, '.claude', 'settings.json')]);
  const codex = await existing([join(home, '.codex', 'sessions'), join(cwd, '.codex'), join(cwd, '.omx')]);
  const cursor = await existing([join(cwd, '.cursor'), join(home, '.cursor'), join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage')]);
  const gemini = await existing([join(home, '.gemini', 'tmp'), join(cwd, '.gemini')]);
  const omc = await existing([join(cwd, '.omc'), join(home, '.claude', '.session-stats.json')]);
  const omx = await existing([join(cwd, '.omx')]);
  const superpowers = await existing([join(cwd, '.gemini', 'superpowers'), join(home, '.gemini', 'extensions', 'superpowers'), join(home, '.gemini', 'tmp')]);
  return {
    claude_code: signal('Claude Code', claude, claude.length ? 'Claude Code session signals found.' : 'Run Claude Code in this project or install the AgentFeed hook.'),
    codex: signal('Codex CLI', codex, codex.length ? 'Codex/OMX signals found.' : 'Run Codex CLI in this project.'),
    cursor: signal('Cursor', cursor, cursor.length ? 'Cursor workspace signals found.' : 'Run Cursor in this project.'),
    gemini_cli: signal('Gemini CLI', gemini, gemini.length ? 'Gemini CLI signals found.' : 'Run Gemini CLI in this project.'),
    omc: signal('OMC', omc, omc.length ? 'OMC plugin metadata found.' : 'No OMC plugin metadata found.'),
    omx: signal('OMX', omx, omx.length ? 'OMX plugin metadata found.' : 'No OMX plugin metadata found.'),
    superpowers: signal('Superpowers', superpowers, superpowers.length ? 'Superpowers/Gemini extension signals found.' : 'No Superpowers signals found.')
  };
}

export function formatAgentSignalLines(signals: AgentSignals): string[] {
  const lines = ['Agent signals:'];
  const order: AgentSignalKey[] = ['claude_code', 'codex', 'cursor', 'gemini_cli', 'omc', 'omx', 'superpowers'];
  for (const key of order) {
    const row = signals[key];
    lines.push(`${row.label}: ${row.detected ? 'detected' : 'not found'}`);
    lines.push(`  ${row.guidance}`);
  }
  return lines;
}
