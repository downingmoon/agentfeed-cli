import { asRecord, asString, numeric, safeJsonParse } from './agent-session-core.js';

export function codexTokenTotal(info: Record<string, unknown>): number {
  const direct = numeric(info.total_tokens) || numeric(info.total);
  if (direct) return direct;
  const total = asRecord(info.total_token_usage) ?? asRecord(info.token_usage) ?? info;
  const nestedDirect = numeric(total.total_tokens) || numeric(total.total);
  if (nestedDirect) return nestedDirect;
  return numeric(total.input_tokens) + numeric(total.cached_input_tokens) + numeric(total.cache_read_input_tokens) + numeric(total.cache_creation_input_tokens) + numeric(total.output_tokens);
}

export function codexCallArguments(call: Record<string, unknown>): Record<string, unknown> | null {
  const direct = asRecord(call.arguments);
  if (direct) return direct;
  const argsText = asString(call.arguments);
  return argsText ? asRecord(safeJsonParse(argsText)) : null;
}

export function codexNestedToolName(value: unknown): string | null {
  const name = asString(value);
  if (!name) return null;
  const parts = name.split('.');
  return parts[parts.length - 1] || name;
}

export function codexNestedToolParameters(toolUse: Record<string, unknown>): Record<string, unknown> {
  const direct = asRecord(toolUse.parameters) ?? asRecord(toolUse.args) ?? asRecord(toolUse.arguments);
  if (direct) return direct;
  const argsText = asString(toolUse.arguments);
  return argsText ? asRecord(safeJsonParse(argsText)) ?? {} : {};
}
