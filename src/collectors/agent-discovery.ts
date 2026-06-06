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

export interface AgentSignalSummaryRow {
  key: AgentSignalKey;
  label: string;
  detected: boolean;
  status: 'detected' | 'missing';
  path_count: number;
  guidance: string;
  next_actions: string[];
}

export interface AgentSignalSummary {
  detected_count: number;
  missing_count: number;
  signals: AgentSignalSummaryRow[];
}

const AGENT_SIGNAL_ORDER: AgentSignalKey[] = ['claude_code', 'codex', 'cursor', 'gemini_cli', 'omc', 'omx', 'superpowers'];

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
  for (const key of AGENT_SIGNAL_ORDER) {
    const row = signals[key];
    lines.push(`${row.label}: ${row.detected ? 'detected' : 'not found'}`);
    lines.push(`  ${row.guidance}`);
    lines.push(...agentSignalGuidanceLines(key));
    if (row.detected && row.paths.length) {
      lines.push('  Detected paths:');
      for (const path of row.paths.slice(0, 3)) lines.push(`  - ${path}`);
      if (row.paths.length > 3) lines.push(`  - ...and ${row.paths.length - 3} more`);
    }
  }
  return lines;
}

export function summarizeAgentSignals(signals: AgentSignals): AgentSignalSummary {
  const rows = AGENT_SIGNAL_ORDER.map((key): AgentSignalSummaryRow => {
    const row = signals[key];
    return {
      key,
      label: row.label,
      detected: row.detected,
      status: row.detected ? 'detected' : 'missing',
      path_count: row.paths.length,
      guidance: row.guidance,
      next_actions: agentSignalNextActions(key)
    };
  });
  return {
    detected_count: rows.filter((row) => row.detected).length,
    missing_count: rows.filter((row) => !row.detected).length,
    signals: rows
  };
}

function agentSignalNextActions(key: AgentSignalKey): string[] {
  switch (key) {
    case 'claude_code':
      return ['agentfeed collect --source claude-code --explain', 'agentfeed hook install claude-code'];
    case 'codex':
      return ['agentfeed collect --source codex --explain', 'agentfeed collect --source codex --session-file <path> --explain'];
    case 'cursor':
      return ['agentfeed collect --source cursor --explain', 'agentfeed collect --source cursor --session-file <path> --explain'];
    case 'gemini_cli':
      return ['agentfeed collect --source gemini-cli --explain', 'agentfeed collect --source gemini-cli --session-file <path> --explain'];
    case 'omc':
      return ['agentfeed collect --source claude-code --explain'];
    case 'omx':
      return ['agentfeed collect --source codex --explain'];
    case 'superpowers':
      return ['agentfeed collect --source gemini-cli --explain'];
  }
}

function agentSignalGuidanceLines(key: AgentSignalKey): string[] {
  switch (key) {
    case 'claude_code':
      return [
        '  Quality: high when Claude Code session rows are available.',
        '  Try: agentfeed collect --source claude-code --explain',
        '  Improve: agentfeed hook install claude-code'
      ];
    case 'codex':
      return [
        '  Quality: high when Codex session rows are available; medium with OMX metadata only.',
        '  Try: agentfeed collect --source codex --explain',
        '  If default discovery misses logs: agentfeed collect --source codex --session-file <path> --explain'
      ];
    case 'cursor':
      return [
        '  Quality: low until a Cursor transcript format is explicitly supported.',
        '  Try: agentfeed collect --source cursor --explain',
        '  Improve: pass an exported Cursor/session metadata file with --session-file <path>.'
      ];
    case 'gemini_cli':
      return [
        '  Quality: high when Gemini CLI session rows are available; medium with Superpowers metadata.',
        '  Try: agentfeed collect --source gemini-cli --explain',
        '  If default discovery misses logs: agentfeed collect --source gemini-cli --session-file <path> --explain'
      ];
    case 'omc':
      return [
        '  Plugin role: enriches Claude evidence with tool calls, subagents, and modes.',
        '  Best paired with: agentfeed collect --source claude-code --explain'
      ];
    case 'omx':
      return [
        '  Plugin role: enriches Codex evidence with tokens, subagents, turns, and modes.',
        '  Best paired with: agentfeed collect --source codex --explain'
      ];
    case 'superpowers':
      return [
        '  Plugin role: enriches Gemini evidence with skill/mode signals.',
        '  Best paired with: agentfeed collect --source gemini-cli --explain'
      ];
  }
}
