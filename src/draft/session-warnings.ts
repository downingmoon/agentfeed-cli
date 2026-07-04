import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentType } from '../types.js';
import type { AutoAgentSources } from './agent-source-detection.js';

type GlobalSignalMismatchInput = {
  readonly autoSources: AutoAgentSources;
  readonly enabledSources: readonly AgentType[];
  readonly explicitSource?: AgentType | null;
  readonly sessionFound: boolean;
  readonly sessionFileProvided: boolean;
};

const SOURCE_LABELS = {
  claude_code: { signal: 'Claude Code', session: 'Claude Code' },
  codex: { signal: 'Codex CLI', session: 'Codex' },
  cursor: { signal: 'Cursor', session: 'Cursor' },
  gemini_cli: { signal: 'Gemini/Antigravity CLI', session: 'Gemini/Antigravity' },
  other: { signal: 'Agent', session: 'Agent' }
} as const satisfies Record<AgentType, { readonly signal: string; readonly session: string }>;

function antigravityConversationDbDetected(): boolean {
  const conversationsDir = join(homedir(), '.gemini', 'antigravity-cli', 'conversations');
  return existsSync(conversationsDir) && readdirSync(conversationsDir).some((entry) => entry.endsWith('.db'));
}

function antigravityTranscriptDetected(): boolean {
  const brainDir = join(homedir(), '.gemini', 'antigravity-cli', 'brain');
  if (!existsSync(brainDir)) return false;
  return readdirSync(brainDir, { withFileTypes: true }).some((entry) => {
    if (!entry.isDirectory()) return false;
    return existsSync(join(brainDir, entry.name, '.system_generated', 'logs', 'transcript.jsonl'));
  });
}

export function globalAgentSignalMismatchWarnings(input: GlobalSignalMismatchInput): string[] {
  if (input.sessionFound || input.sessionFileProvided) return [];
  const candidates = input.explicitSource ? [input.explicitSource] : input.enabledSources;
  return candidates
    .filter((candidate) => input.autoSources.globalOnly.includes(candidate))
    .map((candidate) => {
      const label = SOURCE_LABELS[candidate];
      const base = `${label.signal} signals were detected, but no ${label.session} session matched this project root. If the agent ran from a parent or workspace directory, run agentfeed from that initialized root or pass a session file that belongs to this project.`;
      if (candidate !== 'gemini_cli' || !antigravityConversationDbDetected()) return base;
      const transcriptHint = antigravityTranscriptDetected()
        ? ' Antigravity transcript.jsonl files were detected, but none matched this project root.'
        : '';
      const dbLabel = transcriptHint ? 'Antigravity conversation databases were also detected' : 'Antigravity conversation databases were detected';
      return `${base}${transcriptHint} ${dbLabel}, but AgentFeed currently reads Gemini JSONL chats or Antigravity transcript.jsonl files, not Antigravity protobuf SQLite databases.`;
    });
}
