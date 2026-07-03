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

export function globalAgentSignalMismatchWarnings(input: GlobalSignalMismatchInput): string[] {
  if (input.sessionFound || input.sessionFileProvided) return [];
  const candidates = input.explicitSource ? [input.explicitSource] : input.enabledSources;
  return candidates
    .filter((candidate) => input.autoSources.globalOnly.includes(candidate))
    .map((candidate) => {
      const label = SOURCE_LABELS[candidate];
      return `${label.signal} signals were detected, but no ${label.session} session matched this project root. If the agent ran from a parent or workspace directory, run agentfeed from that initialized root or pass a session file that belongs to this project.`;
    });
}
