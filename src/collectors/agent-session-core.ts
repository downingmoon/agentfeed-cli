import { realpathSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import type { ChangedFileSummary, CollectionQuality, CollectionSource, CollectionWindow, CollectionWindowReason, WorklogMetrics } from '../types.js';
import { shouldIgnoreEvidencePath } from './path-filter.js';
import { rowTimestampMillis, normalizedCollectionWindow } from './agent-session-window.js';

export interface AgentSessionMetrics extends WorklogMetrics {
  session_id?: string | null;
  model?: string | null;
  changed_files: ChangedFileSummary[];
  collection_window?: CollectionWindow | null;
  collection_window_reason?: CollectionWindowReason | null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}

export function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function integer(value: unknown): number | null {
  const n = numeric(value);
  return n ? Math.trunc(n) : null;
}

export function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim().replace(/^\$/, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function costNumber(value: unknown): number | null {
  const n = finiteNumber(value);
  return n != null && n >= 0 ? n : null;
}

export function explicitCostUsd(record?: Record<string, unknown> | null): number | null {
  if (!record) return null;
  const keys = [
    'estimated_cost_usd',
    'estimatedCostUsd',
    'estimatedCostUSD',
    'cost_usd',
    'costUsd',
    'costUSD',
    'total_cost_usd',
    'totalCostUsd',
    'totalCostUSD',
    'usd_cost',
    'usdCost',
    'usd'
  ];
  for (const key of keys) {
    const n = costNumber(record[key]);
    if (n != null) return n;
  }
  for (const key of ['cost', 'billing']) {
    const nested = asRecord(record[key]);
    if (!nested) continue;
    for (const nestedKey of ['usd', 'USD', 'total_usd', 'totalUsd', 'estimated_usd', 'estimatedUsd', 'amount_usd', 'amountUsd']) {
      const n = costNumber(nested[nestedKey]);
      if (n != null) return n;
    }
  }
  return null;
}

function mergeQuality(sources: CollectionSource[]): CollectionQuality | null {
  if (sources.some((source) => source.quality === 'high')) return 'high';
  if (sources.some((source) => source.quality === 'medium')) return 'medium';
  if (sources.some((source) => source.quality === 'low')) return 'low';
  return null;
}

export function pushSource(sources: CollectionSource[], source: CollectionSource) {
  if (!sources.some((row) => row.type === source.type && row.name === source.name)) sources.push(source);
}

export function safeJsonParse(text: string): unknown | null {
  try { return JSON.parse(text); } catch { return null; }
}

function languageFor(path: string): string | null {
  const ext = extname(path).toLowerCase();
  return ({ '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.md': 'Markdown', '.json': 'JSON' } as Record<string, string>)[ext] ?? null;
}

function canonicalPath(path: string): string {
  const absolute = resolve(path);
  const suffix: string[] = [];
  let current = absolute;
  while (true) {
    try {
      const real = realpathSync.native(current);
      return suffix.length ? join(real, ...suffix.reverse()) : real;
    } catch {
      const parent = dirname(current);
      if (parent === current) return absolute;
      suffix.push(basename(current));
      current = parent;
    }
  }
}

export function relativeProjectPath(cwd: string, filePath: string): string | null {
  const absolute = canonicalPath(isAbsolute(filePath) ? filePath : resolve(cwd, filePath));
  const rel = relative(canonicalPath(cwd), absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split('\\').join('/');
}

export function countTextLines(text: string): number {
  if (!text) return 0;
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (!normalized) return 0;
  return normalized.split(/\r?\n/).length;
}

export function countUnifiedDiff(diff: string): { readonly added: number; readonly removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

export function statusForPatchHeader(action: string): ChangedFileSummary['status'] {
  if (action === 'Add') return 'added';
  if (action === 'Delete') return 'deleted';
  return 'modified';
}

export function upsertFile(
  files: Map<string, ChangedFileSummary>,
  path: string,
  input: { readonly status?: ChangedFileSummary['status']; readonly added?: number | null; readonly removed?: number | null }
) {
  if (shouldIgnoreEvidencePath(path)) return;
  const current = files.get(path) ?? {
    path,
    extension: extname(path) || null,
    language: languageFor(path),
    status: input.status ?? 'modified',
    publish_path: false,
    lines_added: 0,
    lines_removed: 0
  };
  current.status = input.status ?? current.status;
  current.lines_added = (current.lines_added ?? 0) + (input.added ?? 0);
  current.lines_removed = (current.lines_removed ?? 0) + (input.removed ?? 0);
  files.set(path, current);
}

const DEFAULT_IDLE_GAP_MILLIS = 30 * 60 * 1000;

export function inferEffectiveCollectionWindow(rows: Record<string, unknown>[], window?: CollectionWindow | null, options: { readonly inferIdleGap?: boolean } = {}): { readonly window: CollectionWindow | null; readonly reason: CollectionWindowReason | null } {
  const explicitWindow = normalizedCollectionWindow(window);
  if (explicitWindow?.since || options.inferIdleGap === false) return { window: explicitWindow, reason: null };

  let lastMillis: number | null = null;
  let sinceMillis: number | null = null;
  for (const row of rows) {
    const millis = rowTimestampMillis(row);
    if (millis == null) continue;
    if (lastMillis != null && millis - lastMillis > DEFAULT_IDLE_GAP_MILLIS) {
      sinceMillis = millis;
    }
    lastMillis = millis;
  }
  if (sinceMillis != null) return { window: { since: new Date(sinceMillis).toISOString(), until: explicitWindow?.until ?? null }, reason: 'idle_gap' };
  return { window: explicitWindow, reason: null };
}

export function finalizeAgentSession(input: {
  readonly sessionId?: string | null;
  readonly model?: string | null;
  readonly files: Map<string, ChangedFileSummary>;
  readonly tokensUsed: number;
  readonly durationSeconds?: number | null;
  readonly testsRun: number;
  readonly failedCommands: number;
  readonly failedTestCommands?: number;
  readonly commandsRun?: number;
  readonly toolCalls?: number;
  readonly estimatedCostUsd?: number | null;
  readonly skills?: Set<string>;
  readonly subagentsSpawned?: number;
  readonly subagentsCompleted?: number;
  readonly agentTurns?: number;
  readonly agentModes?: Set<string>;
  readonly collectionSources?: CollectionSource[];
  readonly collectionWindow?: CollectionWindow | null;
  readonly collectionWindowReason?: CollectionWindowReason | null;
}): AgentSessionMetrics | null {
  const changedFiles = [...input.files.values()];
  const linesAdded = changedFiles.reduce((sum, file) => sum + (file.lines_added ?? 0), 0);
  const linesRemoved = changedFiles.reduce((sum, file) => sum + (file.lines_removed ?? 0), 0);
  const skillsUsed = input.skills?.size ?? 0;
  const agentModes = [...(input.agentModes ?? new Set<string>())].sort();
  const collectionSources = input.collectionSources ?? [];
  const collectionQuality = mergeQuality(collectionSources);
  if (!input.sessionId && !input.model && !changedFiles.length && !input.tokensUsed && !input.estimatedCostUsd && !input.testsRun && !input.failedCommands && !input.toolCalls && !input.commandsRun && !skillsUsed && !input.subagentsSpawned && !input.agentTurns) return null;
  return {
    session_id: input.sessionId ?? null,
    model: input.model ?? null,
    changed_files: changedFiles,
    tokens_used: input.tokensUsed || null,
    estimated_cost_usd: input.estimatedCostUsd && input.estimatedCostUsd > 0 ? input.estimatedCostUsd : null,
    duration_seconds: input.durationSeconds ? Math.round(input.durationSeconds) : null,
    files_changed: changedFiles.length || null,
    lines_added: linesAdded || null,
    lines_removed: linesRemoved || null,
    tests_run: input.testsRun || null,
    tests_passed: input.testsRun ? Math.max(input.testsRun - (input.failedTestCommands ?? 0), 0) : null,
    failed_commands: input.failedCommands || null,
    commands_run: input.commandsRun || null,
    tool_calls: input.toolCalls || null,
    skills_used: skillsUsed || null,
    subagents_spawned: input.subagentsSpawned || null,
    subagents_completed: input.subagentsCompleted || null,
    agent_turns: input.agentTurns || null,
    agent_modes: agentModes.length ? agentModes : null,
    collection_quality: collectionQuality,
    collection_sources: collectionSources.length ? collectionSources : null,
    collection_window: input.collectionWindow ?? null,
    collection_window_reason: input.collectionWindowReason ?? null
  };
}
