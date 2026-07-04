import { asString, safeJsonParse } from './agent-session-core.js';

const SUBAGENT_COMPLETION_SIGNAL = /(?:✅|completed successfully|created successfully|created the file|finished successfully|passes? TypeScript|passed TypeScript|작업 완료|완료)/i;

export function unquotedAntigravityString(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  if (text.startsWith('"')) {
    const parsed = safeJsonParse(text);
    return typeof parsed === 'string' && parsed.length ? parsed : text;
  }
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1);
  return text;
}

export function countAntigravitySubagentSpecs(value: unknown): number {
  const text = unquotedAntigravityString(value);
  if (!text) return 0;
  const parsed = safeJsonParse(text);
  return Array.isArray(parsed) ? parsed.length : 0;
}

export function antigravitySubagentIds(content: string): readonly string[] {
  return [...content.matchAll(/"conversationId"\s*:\s*"(?<id>[^"]+)"/g)].flatMap((match) => {
    const id = match.groups?.id;
    return id ? [id] : [];
  });
}

export function completedAntigravitySubagentId(content: string, spawnedIds: ReadonlySet<string>): string | null {
  const sender = /(?:^|\s)sender=(?<sender>[^\s]+)/.exec(content)?.groups?.sender;
  if (!sender || !spawnedIds.has(sender)) return null;
  if (!SUBAGENT_COMPLETION_SIGNAL.test(content)) return null;
  return sender;
}
