import type { AgentType } from '../types.js';

const SOURCE_ALIASES: Record<string, AgentType> = {
  claude: 'claude_code',
  claude_code: 'claude_code',
  claude_code_cli: 'claude_code',
  claude_code_sdk: 'claude_code',
  codex: 'codex',
  cursor: 'cursor',
  gemini: 'gemini_cli',
  gemini_cli: 'gemini_cli',
  other: 'other'
};

const SUPPORTED_SOURCES = ['claude-code', 'codex', 'cursor', 'gemini-cli', 'other'];

export function parseAgentSource(value?: string | null): AgentType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  const source = SOURCE_ALIASES[normalized];
  if (!source) {
    throw new Error(`Unsupported agent source: ${value}. Supported sources: ${SUPPORTED_SOURCES.join(', ')}`);
  }
  return source;
}
