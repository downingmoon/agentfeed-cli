import { asRecord, asString } from './agent-session-core.js';

export function isTestCommand(command: string): boolean {
  const normalized = command.trim();
  return /(^|&&|\|\||;)\s*(npm|pnpm|yarn|bun)\s+(run\s+)?(test|test:[\w:-]+)\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*(pnpm|yarn|bun)\s+(exec\s+)?(vitest|jest|pytest|mocha)\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*(pnpm|yarn|bun)\s+(exec\s+)?playwright\s+test\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*(pnpm|yarn|bun)\s+(exec\s+)?cypress\s+run\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*((npx|npm\s+exec)\s+)?(vitest|jest|pytest|mocha)\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*((npx|npm\s+exec)\s+)?playwright\s+test\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*((npx|npm\s+exec)\s+)?cypress\s+run\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*uv\s+run\b.*\b((python3?\s+-m\s+)?(pytest|unittest)|(vitest|jest|mocha)\b|playwright\s+test\b|cypress\s+run\b)/i.test(normalized)
    || /(^|&&|\|\||;)\s*python3?\s+-m\s+(pytest|unittest)\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*node\b(?=[^;&|]*\s--test\b)/i.test(normalized)
    || /(^|&&|\|\||;)\s*make\s+[\w:-]*test[\w:-]*\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*(?:\.\/)?mvnw?\s+(?:-[^\s]+\s+)*test\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*(?:\.\/)?gradlew?\s+(?:-[^\s]+\s+)*[\w.:-]*test[\w.:-]*\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*go\s+test\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*cargo\s+test\b/i.test(normalized);
}

export function commandFailed(output: string): boolean {
  const text = output.trim();
  if (!text) return false;
  if (/(?:Process exited with code|exit code)\s*[:=]?\s*[1-9]\d*/i.test(text)) return true;
  if (/^\s*(?:FAIL|FAILED)\b/im.test(text)) return true;
  if (/\b[1-9]\d*\s+failed\b/i.test(text)) return true;
  if (/\bfailed\s*[:=]\s*[1-9]\d*\b/i.test(text)) return true;
  if (/\bfailures?\s*[:=]\s*[1-9]\d*\b/i.test(text)) return true;
  if (/(?:^|\n)\s*#?\s*fail(?:ed)?\s+[1-9]\d*\b/i.test(text)) return true;
  if (/"Action"\s*:\s*"fail"/i.test(text)) return true;
  return false;
}

export function failedStatus(value: unknown): boolean {
  const status = asString(value)?.toLowerCase();
  return status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled';
}

export function toolOutputFailed(output: string): boolean {
  const text = output.trim();
  if (!text) return false;
  return commandFailed(text) || /\b(failed|error|unavailable|not found|denied)\b/i.test(text);
}

export function toolResultOutput(item: Record<string, unknown>): string {
  const content = item.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    const record = asRecord(part);
    return asString(record?.text) ?? asString(record?.content) ?? '';
  }).filter(Boolean).join('\n');
}
