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
  antigravity: 'gemini_cli',
  antigravity_cli: 'gemini_cli',
  agy: 'gemini_cli',
  other: 'other'
};

export const SUPPORTED_SOURCES = ['claude-code', 'codex', 'cursor', 'gemini-cli', 'other'] as const;
type SourceCommand = 'collect' | 'share';

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j < previous.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function commonPrefixLength(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let index = 0;
  while (index < length && a[index] === b[index]) index += 1;
  return index;
}

function closestSource(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  let best: { source: string; distance: number; prefix: number } | null = null;
  for (const source of SUPPORTED_SOURCES) {
    const distance = editDistance(normalized, source);
    const prefix = commonPrefixLength(normalized, source);
    if (!best || distance < best.distance || (distance === best.distance && prefix > best.prefix)) {
      best = { source, distance, prefix };
    }
  }
  if (!best) return null;
  const threshold = Math.max(2, Math.floor(Math.max(normalized.length, best.source.length) / 3));
  return best.distance <= threshold ? best.source : null;
}

function unsupportedSourceMessage(value: string, command?: SourceCommand): string {
  const suggestion = closestSource(value);
  const lines = [
    `Unsupported agent source: ${value}`,
    `Supported sources: ${SUPPORTED_SOURCES.join(', ')}`,
    'Tip: omit --source to let AgentFeed auto-detect Claude/Codex/Cursor/Gemini/Antigravity sessions.'
  ];
  if (suggestion) lines.push(`Did you mean: --source ${suggestion}`);
  if (command === 'share') {
    lines.push('Run: agentfeed share --dry');
    lines.push(`Run: agentfeed share --source ${suggestion ?? '<source>'} --dry`);
    lines.push('Run: agentfeed share --help');
  } else {
    lines.push('Run: agentfeed collect --explain');
    lines.push(`Run: agentfeed collect --source ${suggestion ?? '<source>'} --explain`);
    lines.push('Run: agentfeed collect --help');
  }
  return lines.join('\n');
}

export function parseAgentSource(value?: string | null, command?: SourceCommand): AgentType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  const source = SOURCE_ALIASES[normalized];
  if (!source) {
    throw new Error(unsupportedSourceMessage(value, command));
  }
  return source;
}
