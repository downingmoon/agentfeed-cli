import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChangedFileSummary, CollectionQuality, CollectionWindow } from '../types.js';
import {
  asRecord,
  asString,
  countUnifiedDiff,
  explicitCostUsd,
  integer,
  relativeProjectPath,
  safeJsonParse,
  upsertFile,
} from './agent-session-core.js';
import { finalizeAgentSession, type AgentSessionMetrics } from './agent-session-finalize.js';
import { hasCollectionWindowBoundary, normalizedCollectionWindow, rowInCollectionWindow } from './agent-session-window.js';

function firstInteger(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = integer(record[key]);
    if (value != null) return value;
  }
  return null;
}

function addModes(target: Set<string>, value: unknown) {
  if (typeof value === 'string' && value) target.add(value);
  else if (Array.isArray(value)) {
    for (const item of value) if (typeof item === 'string' && item) target.add(item);
  }
}

function changedFileStatus(value: unknown): ChangedFileSummary['status'] {
  const text = asString(value)?.toLowerCase();
  if (text === 'add' || text === 'added' || text === 'create' || text === 'created') return 'added';
  if (text === 'delete' || text === 'deleted' || text === 'remove' || text === 'removed') return 'deleted';
  if (text === 'rename' || text === 'renamed' || text === 'move' || text === 'moved') return 'renamed';
  if (text === 'modify' || text === 'modified' || text === 'update' || text === 'updated' || text === 'edit' || text === 'edited') return 'modified';
  return 'unknown';
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function normalizedGenericPath(rawPath: string): string {
  if (!rawPath.startsWith('file://')) return rawPath;
  const encodedPath = rawPath.slice('file://'.length);
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

function applyGenericChangedFile(cwd: string, raw: unknown, files: Map<string, ChangedFileSummary>, fallbackPath?: string) {
  if (typeof raw === 'string') {
    const rel = relativeProjectPath(cwd, raw);
    if (rel) upsertFile(files, rel, { status: 'modified', added: null, removed: null });
    return;
  }
  const record = asRecord(raw);
  if (!record) return;
  const rawPath = firstString(record, ['path', 'file_path', 'filePath', 'file', 'uri']) ?? fallbackPath ?? null;
  if (!rawPath) return;
  const normalizedPath = normalizedGenericPath(rawPath);
  const rel = relativeProjectPath(cwd, normalizedPath);
  if (!rel) return;
  const diff = asString(record.unified_diff) ?? asString(record.diff) ?? asString(record.patch);
  const diffCounts = diff ? countUnifiedDiff(diff) : null;
  const added = firstInteger(record, ['lines_added', 'linesAdded', 'additions', 'added']) ?? diffCounts?.added ?? null;
  const removed = firstInteger(record, ['lines_removed', 'linesRemoved', 'deletions', 'removed']) ?? diffCounts?.removed ?? null;
  const status = changedFileStatus(record.status ?? record.type ?? record.kind);
  upsertFile(files, rel, { status: status === 'unknown' ? 'modified' : status, added, removed });
}

function applyGenericChangedFiles(cwd: string, raw: unknown, files: Map<string, ChangedFileSummary>) {
  if (Array.isArray(raw)) {
    for (const item of raw) applyGenericChangedFile(cwd, item, files);
    return;
  }
  const record = asRecord(raw);
  if (!record) return;
  for (const [path, change] of Object.entries(record)) applyGenericChangedFile(cwd, change, files, path);
}

type GenericAccumulator = {
  sessionId: string | null;
  model: string | null;
  tokensUsed: number;
  estimatedCostUsd: number;
  commandsRun: number;
  toolCalls: number;
  agentTurns: number;
  agentModes: Set<string>;
};

function applyGenericRecord(record: Record<string, unknown>, acc: GenericAccumulator, cwd: string, files: Map<string, ChangedFileSummary>) {
  acc.sessionId ??= asString(record.session_id) ?? asString(record.sessionId);
  acc.model ??= asString(record.model);
  acc.tokensUsed = Math.max(acc.tokensUsed, firstInteger(record, ['tokens_used', 'tokensUsed', 'total_tokens', 'totalTokens']) ?? 0);
  acc.estimatedCostUsd = Math.max(acc.estimatedCostUsd, explicitCostUsd(record) ?? 0);
  const tokens = asRecord(record.tokens) ?? asRecord(record.token_usage) ?? asRecord(record.tokenUsage);
  if (tokens) {
    acc.tokensUsed = Math.max(acc.tokensUsed, firstInteger(tokens, ['total', 'total_tokens', 'totalTokens']) ?? 0);
    acc.estimatedCostUsd = Math.max(acc.estimatedCostUsd, explicitCostUsd(tokens) ?? 0);
  }
  acc.commandsRun = Math.max(acc.commandsRun, firstInteger(record, ['commands_run', 'commandsRun', 'commands', 'command_count', 'commandCount']) ?? 0);
  acc.toolCalls = Math.max(acc.toolCalls, firstInteger(record, ['tool_calls', 'toolCalls', 'tools', 'tool_count', 'toolCount']) ?? 0);
  acc.agentTurns = Math.max(acc.agentTurns, firstInteger(record, ['agent_turns', 'agentTurns', 'turn_count', 'turnCount', 'turns']) ?? 0);
  addModes(acc.agentModes, record.agent_modes ?? record.agentModes ?? record.modes ?? record.mode);
  for (const key of ['changed_files', 'changedFiles', 'files', 'edits', 'changes']) applyGenericChangedFiles(cwd, record[key], files);

  for (const key of ['metrics', 'stats', 'summary']) {
    const nested = asRecord(record[key]);
    if (nested) applyGenericRecord(nested, acc, cwd, files);
  }
}

async function genericRecordsFromFile(path: string): Promise<Record<string, unknown>[]> {
  let text: string;
  try {
    const info = await stat(path);
    if (info.size > 1_000_000) return [];
    text = await readFile(path, 'utf8');
  } catch {
    return [];
  }
  const parsed = safeJsonParse(text);
  if (Array.isArray(parsed)) return parsed.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  const record = asRecord(parsed);
  if (record) return [record];
  const rows: Record<string, unknown>[] = [];
  for (const line of text.split('\n')) {
    const lineRecord = asRecord(safeJsonParse(line));
    if (lineRecord) rows.push(lineRecord);
  }
  return rows;
}

async function genericMetadataFiles(cwd: string, roots = ['.ai', '.agent', '.agents', '.aider']): Promise<string[]> {
  const files: Array<{ readonly path: string; readonly mtime: number }> = [];
  async function walk(current: string, depth: number) {
    if (depth < 0) return;
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path, depth - 1);
      else if (entry.isFile() && /\.(json|jsonl|log)$/i.test(entry.name)) {
        try { files.push({ path, mtime: (await stat(path)).mtimeMs }); } catch { }
      }
    }
  }
  for (const root of roots) await walk(join(cwd, root), 3);
  return files.sort((a, b) => b.mtime - a.mtime).slice(0, 20).map((row) => row.path);
}

export async function parseGenericMetadata(cwd: string, sessionFile?: string | null, window?: CollectionWindow | null, options: { readonly sourceName?: string; readonly roots?: string[]; readonly quality?: CollectionQuality } = {}): Promise<AgentSessionMetrics | null> {
  const acc = { sessionId: null as string | null, model: null as string | null, tokensUsed: 0, estimatedCostUsd: 0, commandsRun: 0, toolCalls: 0, agentTurns: 0, agentModes: new Set<string>() };
  const changedFiles = new Map<string, ChangedFileSummary>();
  const metadataFiles = sessionFile ? [sessionFile] : await genericMetadataFiles(cwd, options.roots);
  const includeMissingTimestamp = !hasCollectionWindowBoundary(window);
  for (const file of metadataFiles) {
    for (const record of await genericRecordsFromFile(file)) {
      if (rowInCollectionWindow(record, window, { includeMissingTimestamp })) applyGenericRecord(record, acc, cwd, changedFiles);
    }
  }
  return finalizeAgentSession({
    sessionId: acc.sessionId,
    model: acc.model,
    files: changedFiles,
    tokensUsed: acc.tokensUsed,
    estimatedCostUsd: acc.estimatedCostUsd,
    testsRun: 0,
    failedCommands: 0,
    commandsRun: acc.commandsRun,
    toolCalls: acc.toolCalls,
    agentTurns: acc.agentTurns,
    agentModes: acc.agentModes,
    collectionSources: metadataFiles.length ? [{ type: 'generic_metadata', name: options.sourceName ?? 'unknown_plugin', quality: options.quality ?? 'low' }] : [],
    collectionWindow: normalizedCollectionWindow(window)
  });
}
