export const PYTHON_LITERAL_COLLECTION = String.raw`(?<payload>\{[^\n]*\}|\[[^\n]*\])`;

type LiteralParseResult = {
  readonly next: number;
  readonly lines: number;
};


function literalCollectionItemCount(payload: string): number {
  const inner = payload.slice(1, -1).trim();
  if (!inner) return 0;
  let items = 1;
  let quote: string | null = null;
  let escaped = false;
  for (const char of inner) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ',') items += 1;
  }
  return items;
}

function skipLiteralSpace(payload: string, index: number): number {
  let current = index;
  while (/\s/.test(payload[current] ?? '')) current += 1;
  return current;
}

function skipQuotedLiteral(payload: string, index: number): number {
  const quote = payload[index];
  let escaped = false;
  for (let current = index + 1; current < payload.length; current += 1) {
    const char = payload[current];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === quote) return current + 1;
  }
  return payload.length;
}

function skipLiteralScalar(payload: string, index: number): number {
  if (payload[index] === '"' || payload[index] === "'") return skipQuotedLiteral(payload, index);
  let current = index;
  while (current < payload.length && !/[,\]}]/.test(payload[current])) current += 1;
  return current;
}

function parseLiteralCollection(payload: string, index: number): LiteralParseResult | null {
  const isDict = payload[index] === '{';
  const close = isDict ? '}' : ']';
  let current = skipLiteralSpace(payload, index + 1);
  if (payload[current] === close) return { next: current + 1, lines: 1 };
  let lines = 2;
  while (current < payload.length) {
    if (isDict) {
      current = payload[current] === '"' || payload[current] === "'"
        ? skipQuotedLiteral(payload, current)
        : skipLiteralScalar(payload, current);
      current = skipLiteralSpace(payload, current);
      if (payload[current] !== ':') return null;
      current = skipLiteralSpace(payload, current + 1);
    }
    const value = parseLiteralValue(payload, current);
    if (!value) return null;
    lines += value.lines;
    current = skipLiteralSpace(payload, value.next);
    if (payload[current] === ',') {
      current = skipLiteralSpace(payload, current + 1);
      continue;
    }
    if (payload[current] === close) return { next: current + 1, lines };
    return null;
  }
  return null;
}

function parseLiteralValue(payload: string, index: number): LiteralParseResult | null {
  const current = skipLiteralSpace(payload, index);
  if (payload[current] === '{' || payload[current] === '[') return parseLiteralCollection(payload, current);
  const next = skipLiteralScalar(payload, current);
  return next > current ? { next, lines: 1 } : null;
}

function jsonPrettyLiteralLineCount(payload: string): number | null {
  const parsed = parseLiteralValue(payload, 0);
  if (!parsed) return null;
  return skipLiteralSpace(payload, parsed.next) === payload.length ? parsed.lines : null;
}

function literalHasNestedCollection(payload: string): boolean {
  let depth = 0;
  for (let index = 0; index < payload.length; index += 1) {
    const char = payload[index];
    if (char === '"' || char === "'") {
      index = skipQuotedLiteral(payload, index) - 1;
      continue;
    }
    if (char === '{' || char === '[') {
      if (depth > 0) return true;
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth = Math.max(0, depth - 1);
    }
  }
  return false;
}

export function literalDumpLineCount(serializer: string, payload: string, call: string): number | null {
  const items = literalCollectionItemCount(payload);
  if (serializer === 'json.dump') return /,\s*indent\s*=/.test(call) ? jsonPrettyLiteralLineCount(payload) : 1;
  if (/,\s*default_flow_style\s*=\s*True\b/.test(call)) return null;
  if (literalHasNestedCollection(payload)) return null;
  return Math.max(items, 1);
}
