import { homedir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import type { AgentType, ChangedFileSummary, CollectionQuality, CollectionSource, CollectionWindow, CollectionWindowReason, WorklogMetrics } from '../types.js';
import { shouldIgnoreEvidencePath } from './path-filter.js';

export interface AgentSessionMetrics extends WorklogMetrics {
  session_id?: string | null;
  model?: string | null;
  changed_files: ChangedFileSummary[];
  collection_window?: CollectionWindow | null;
  collection_window_reason?: CollectionWindowReason | null;
}

interface CollectAgentSessionOptions {
  cwd: string;
  source: AgentType;
  sessionFile?: string | null;
  since?: string | null;
  until?: string | null;
  inferIdleGap?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function integer(value: unknown): number | null {
  const n = numeric(value);
  return n ? Math.trunc(n) : null;
}

function finiteNumber(value: unknown): number | null {
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

function explicitCostUsd(record?: Record<string, unknown> | null): number | null {
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

function pushSource(sources: CollectionSource[], source: CollectionSource) {
  if (!sources.some((row) => row.type === source.type && row.name === source.name)) sources.push(source);
}

function safeJsonParse(text: string): unknown | null {
  try { return JSON.parse(text); } catch { return null; }
}

function parseJsonlRecords(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const row = asRecord(safeJsonParse(line));
    if (row) rows.push(row);
  }
  return rows;
}

function findStructuredCwd(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const cwd = asString(record.cwd);
  if (cwd) return cwd;
  const payload = asRecord(record.payload);
  if (payload) {
    const payloadCwd = asString(payload.cwd);
    if (payloadCwd) return payloadCwd;
  }
  return null;
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

async function structuredCwdMatchState(sessionFile: string, cwd: string): Promise<{ sawStructuredCwd: boolean; matchedProject: boolean }> {
  const projectRoot = canonicalPath(cwd);
  let sawStructuredCwd = false;
  for (const line of (await readFile(sessionFile, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const structuredCwd = findStructuredCwd(safeJsonParse(line));
    if (!structuredCwd) continue;
    sawStructuredCwd = true;
    const absoluteCwd = canonicalPath(structuredCwd);
    if (absoluteCwd === projectRoot || absoluteCwd.startsWith(`${projectRoot}/`)) return { sawStructuredCwd, matchedProject: true };
  }
  return { sawStructuredCwd, matchedProject: false };
}

export async function sessionFileBelongsToProject(sessionFile: string, cwd: string): Promise<boolean> {
  return (await structuredCwdMatchState(sessionFile, cwd)).matchedProject;
}

async function sessionFileMayBelongToProject(sessionFile: string, cwd: string): Promise<boolean> {
  const state = await structuredCwdMatchState(sessionFile, cwd);
  return !state.sawStructuredCwd || state.matchedProject;
}

function languageFor(path: string): string | null {
  const ext = extname(path).toLowerCase();
  return ({ '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.md': 'Markdown', '.json': 'JSON' } as Record<string, string>)[ext] ?? null;
}

function relativeProjectPath(cwd: string, filePath: string): string | null {
  const absolute = canonicalPath(isAbsolute(filePath) ? filePath : resolve(cwd, filePath));
  const rel = relative(canonicalPath(cwd), absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split('\\').join('/');
}

function countTextLines(text: string): number {
  if (!text) return 0;
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (!normalized) return 0;
  return normalized.split(/\r?\n/).length;
}

function countUnifiedDiff(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

function statusForPatchHeader(action: string): ChangedFileSummary['status'] {
  if (action === 'Add') return 'added';
  if (action === 'Delete') return 'deleted';
  return 'modified';
}

function upsertFile(
  files: Map<string, ChangedFileSummary>,
  path: string,
  input: { status?: ChangedFileSummary['status']; added?: number | null; removed?: number | null }
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

function applyCodexPatchText(cwd: string, patch: string, files: Map<string, ChangedFileSummary>) {
  let currentPath: string | null = null;
  let currentStatus: ChangedFileSummary['status'] = 'modified';
  let added = 0;
  let removed = 0;

  function flush() {
    if (!currentPath) return;
    const rel = relativeProjectPath(cwd, currentPath);
    if (rel) upsertFile(files, rel, { status: currentStatus, added, removed });
    currentPath = null;
    currentStatus = 'modified';
    added = 0;
    removed = 0;
  }

  for (const line of patch.split('\n')) {
    const header = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (header) {
      flush();
      currentStatus = statusForPatchHeader(header[1]);
      currentPath = header[2].trim();
      continue;
    }
    if (!currentPath || line.startsWith('***') || line.startsWith('@@')) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) added += 1;
    else if (line.startsWith('-') && !line.startsWith('---')) removed += 1;
  }
  flush();
}

function isTestCommand(command: string): boolean {
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
    || /(^|&&|\|\||;)\s*make\s+[\w:-]*test[\w:-]*\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*go\s+test\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*cargo\s+test\b/i.test(normalized);
}

function commandFailed(output: string): boolean {
  const text = output.trim();
  if (!text) return false;
  if (/(?:Process exited with code|exit code)\s*[:=]?\s*[1-9]\d*/i.test(text)) return true;
  if (/^\s*(?:FAIL|FAILED)\b/im.test(text)) return true;
  if (/\b[1-9]\d*\s+failed\b/i.test(text)) return true;
  if (/\bfailed\s*[:=]\s*[1-9]\d*\b/i.test(text)) return true;
  if (/\bfailures?\s*[:=]\s*[1-9]\d*\b/i.test(text)) return true;
  return false;
}

function failedStatus(value: unknown): boolean {
  const status = asString(value)?.toLowerCase();
  return status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled';
}

function toolOutputFailed(output: string): boolean {
  const text = output.trim();
  if (!text) return false;
  return commandFailed(text) || /\b(failed|error|unavailable|not found|denied)\b/i.test(text);
}

function toolResultOutput(item: Record<string, unknown>): string {
  const content = item.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    const record = asRecord(part);
    return asString(record?.text) ?? asString(record?.content) ?? '';
  }).filter(Boolean).join('\n');
}

function parseIsoMillis(value: unknown): number | null {
  const text = asString(value);
  if (!text) return null;
  const millis = Date.parse(text);
  return Number.isFinite(millis) ? millis : null;
}

function parseTimestampMillis(value: unknown): number | null {
  const isoMillis = parseIsoMillis(value);
  if (isoMillis != null) return isoMillis;
  const n = finiteNumber(value);
  if (n == null || n <= 0) return null;
  if (n > 1_000_000_000_000) return n;
  if (n > 1_000_000_000) return n * 1000;
  return null;
}

function parseBoundaryMillis(value?: string | null): number | null {
  if (!value) return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`Invalid collection window timestamp: ${value}`);
  return millis;
}

function rowTimestampMillis(row: Record<string, unknown>): number | null {
  return parseTimestampMillis(row.timestamp)
    ?? parseTimestampMillis(row.created_at)
    ?? parseTimestampMillis(row.createdAt)
    ?? parseTimestampMillis(row.updated_at)
    ?? parseTimestampMillis(row.updatedAt)
    ?? parseTimestampMillis(row.lastUpdated)
    ?? parseTimestampMillis(row.startTime)
    ?? parseTimestampMillis(row.time)
    ?? parseTimestampMillis(row.ts);
}

function rowInCollectionWindow(row: Record<string, unknown>, window?: CollectionWindow | null, options: { includeMissingTimestamp?: boolean } = {}): boolean {
  const sinceMillis = parseBoundaryMillis(window?.since);
  const untilMillis = parseBoundaryMillis(window?.until);
  if (sinceMillis == null && untilMillis == null) return true;
  const millis = rowTimestampMillis(row);
  if (millis == null) return options.includeMissingTimestamp ?? true;
  if (sinceMillis != null && millis < sinceMillis) return false;
  if (untilMillis != null && millis > untilMillis) return false;
  return true;
}

function hasCollectionWindowBoundary(window?: CollectionWindow | null): boolean {
  return Boolean(window?.since || window?.until);
}

function rowInAgentCollectionWindow(row: Record<string, unknown>, window?: CollectionWindow | null): boolean {
  return rowInCollectionWindow(row, window, { includeMissingTimestamp: !hasCollectionWindowBoundary(window) });
}

const DEFAULT_IDLE_GAP_MILLIS = 30 * 60 * 1000;

function normalizedCollectionWindow(window?: CollectionWindow | null): CollectionWindow | null {
  const since = window?.since ?? null;
  const until = window?.until ?? null;
  return since || until ? { since, until } : null;
}

function inferEffectiveCollectionWindow(rows: Record<string, unknown>[], window?: CollectionWindow | null, options: { inferIdleGap?: boolean } = {}): { window: CollectionWindow | null; reason: CollectionWindowReason | null } {
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

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  return asRecord(safeJsonParse(await readFile(path, 'utf8').catch(() => '')));
}

function finalize(input: {
  sessionId?: string | null;
  model?: string | null;
  files: Map<string, ChangedFileSummary>;
  tokensUsed: number;
  durationSeconds?: number | null;
  testsRun: number;
  failedCommands: number;
  failedTestCommands?: number;
  commandsRun?: number;
  toolCalls?: number;
  estimatedCostUsd?: number | null;
  skills?: Set<string>;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentTurns?: number;
  agentModes?: Set<string>;
  collectionSources?: CollectionSource[];
  collectionWindow?: CollectionWindow | null;
  collectionWindowReason?: CollectionWindowReason | null;
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

async function readOmcMetadata(cwd: string, sessionId: string | null): Promise<{
  toolCalls?: number;
  estimatedCostUsd?: number;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentModes?: string[];
  detected?: boolean;
}> {
  if (!sessionId) return {};
  const result: { toolCalls?: number; estimatedCostUsd?: number; subagentsSpawned?: number; subagentsCompleted?: number; agentModes?: string[]; detected?: boolean } = {};
  const session = await readJsonFile(join(cwd, '.omc', 'sessions', `${sessionId}.json`));
  if (session) {
    result.detected = true;
    result.estimatedCostUsd = explicitCostUsd(session) ?? undefined;
    result.subagentsSpawned = integer(session.agents_spawned) ?? undefined;
    result.subagentsCompleted = integer(session.agents_completed) ?? undefined;
    result.agentModes = Array.isArray(session.modes_used) ? session.modes_used.filter((mode): mode is string => typeof mode === 'string') : undefined;
  }
  const stats = await readJsonFile(join(homedir(), '.claude', '.session-stats.json'));
  const statsSession = asRecord(asRecord(stats?.sessions)?.[sessionId]);
  result.estimatedCostUsd = Math.max(result.estimatedCostUsd ?? 0, explicitCostUsd(statsSession) ?? 0) || result.estimatedCostUsd;
  const totalCalls = integer(statsSession?.total_calls);
  if (totalCalls) { result.toolCalls = totalCalls; result.detected = true; }
  return result;
}

async function readOmxMetadata(cwd: string, sessionId: string | null): Promise<{
  tokensUsed?: number;
  estimatedCostUsd?: number;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentTurns?: number;
  agentModes?: string[];
  detected?: boolean;
}> {
  const result: { tokensUsed?: number; estimatedCostUsd?: number; subagentsSpawned?: number; subagentsCompleted?: number; agentTurns?: number; agentModes?: string[]; detected?: boolean } = {};
  const metrics = await readJsonFile(join(cwd, '.omx', 'metrics.json'));
  result.tokensUsed = integer(metrics?.session_total_tokens) ?? undefined;
  result.estimatedCostUsd = explicitCostUsd(metrics) ?? undefined;
  if (metrics) result.detected = true;
  const tracking = await readJsonFile(join(cwd, '.omx', 'state', 'subagent-tracking.json'));
  const sessions = asRecord(tracking?.sessions);
  const exactSession = sessionId && sessions ? asRecord(sessions[sessionId]) : null;
  const fallbackSession = !sessionId && sessions ? asRecord(Object.values(sessions)[0]) : null;
  const session = exactSession ?? fallbackSession;
  const declaredSessionId = asString(session?.session_id);
  const threads = sessionId && declaredSessionId && declaredSessionId !== sessionId ? null : asRecord(session?.threads);
  if (threads) {
    result.detected = true;
    let spawned = 0;
    let turns = 0;
    const modes = new Set<string>();
    for (const threadRaw of Object.values(threads)) {
      const thread = asRecord(threadRaw);
      if (!thread) continue;
      if (thread.kind === 'subagent') spawned += 1;
      turns += integer(thread.turn_count) ?? 0;
      const mode = asString(thread.mode);
      if (mode) modes.add(mode);
    }
    result.subagentsSpawned = spawned || undefined;
    result.subagentsCompleted = spawned || undefined;
    result.agentTurns = turns || undefined;
    result.agentModes = [...modes];
  }
  return result;
}

async function parseClaudeSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = parseJsonlRecords(await readFile(sessionFile, 'utf8'));
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  const files = new Map<string, ChangedFileSummary>();
  const commands = new Map<string, { command: string; test: boolean }>();
  const pendingFileEdits = new Map<string, { path: string; status: ChangedFileSummary['status']; added: number; removed: number; failed: boolean }>();
  let tokensUsed = 0;
  let durationSeconds: number | null = null;
  let estimatedCostUsd = 0;
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  let agentTurns = 0;
  let subagentsSpawned = 0;
  let subagentsCompleted = 0;
  let sessionId: string | null = null;
  let model: string | null = null;
  let matchedWindowRow = false;

  for (const row of rows) {
    const message = asRecord(row.message);
    if (!message) continue;
    sessionId ??= asString(row.sessionId);
    model ??= asString(message.model);
    if (!rowInAgentCollectionWindow(row, effectiveWindow)) continue;
    matchedWindowRow = true;
    if (row.type === 'assistant') agentTurns += 1;
    estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(row) ?? 0, explicitCostUsd(message) ?? 0);
    const usage = asRecord(message.usage);
    if (usage) {
      tokensUsed += numeric(usage.input_tokens) + numeric(usage.cache_creation_input_tokens) + numeric(usage.cache_read_input_tokens) + numeric(usage.output_tokens);
      estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(usage) ?? 0);
    }
    const content = Array.isArray(message.content) ? message.content : [];
    for (const itemRaw of content) {
      const item = asRecord(itemRaw);
      if (!item) continue;
      if (item.type === 'tool_result') {
        const toolUseId = asString(item.tool_use_id);
        const pendingFileEdit = toolUseId ? pendingFileEdits.get(toolUseId) : null;
        if (pendingFileEdit && (item.is_error === true || commandFailed(toolResultOutput(item)))) {
          pendingFileEdit.failed = true;
        }
        const command = toolUseId ? commands.get(toolUseId) : null;
        if (command && (item.is_error === true || commandFailed(toolResultOutput(item)))) {
          failedCommands += 1;
          if (command.test) failedTestCommands += 1;
        }
        continue;
      }
      if (item.type !== 'tool_use') continue;
      toolCalls += 1;
      const name = asString(item.name);
      const input = asRecord(item.input) ?? {};
      const filePath = asString(input.file_path);
      if (filePath && ['Write', 'Edit', 'MultiEdit'].includes(name ?? '')) {
        const rel = relativeProjectPath(cwd, filePath);
        if (!rel) continue;
        let added = 0;
        let removed = 0;
        if (name === 'Write') added = countTextLines(asString(input.content) ?? '');
        else if (name === 'Edit') {
          added = countTextLines(asString(input.new_string) ?? '');
          removed = countTextLines(asString(input.old_string) ?? '');
        } else if (Array.isArray(input.edits)) {
          for (const editRaw of input.edits) {
            const edit = asRecord(editRaw) ?? {};
            added += countTextLines(asString(edit.new_string) ?? '');
            removed += countTextLines(asString(edit.old_string) ?? '');
          }
        }
        const status: ChangedFileSummary['status'] = name === 'Write' ? 'added' : 'modified';
        const toolUseId = asString(item.id);
        if (toolUseId) pendingFileEdits.set(toolUseId, { path: rel, status, added, removed, failed: false });
        else upsertFile(files, rel, { status, added, removed });
      }
      if (name === 'Bash') {
        const command = asString(input.command) ?? '';
        commandsRun += 1;
        const test = isTestCommand(command);
        if (test) testsRun += 1;
        const toolUseId = asString(item.id);
        if (toolUseId && command) commands.set(toolUseId, { command, test });
      }
      if (name === 'Skill') {
        const skill = asString(input.skill);
        if (skill) skills.add(skill);
      }
      if (name === 'Agent' || name === 'Task') subagentsSpawned += 1;
    }
  }
  for (const edit of pendingFileEdits.values()) {
    if (!edit.failed) upsertFile(files, edit.path, { status: edit.status, added: edit.added, removed: edit.removed });
  }
  if (hasCollectionWindowBoundary(effectiveWindow) && !matchedWindowRow) return null;
  const collectionSources: CollectionSource[] = [{ type: 'agent_session', name: 'claude_code', quality: 'high' }];
  const omc = await readOmcMetadata(cwd, sessionId);
  if (omc.detected) pushSource(collectionSources, { type: 'plugin_metadata', name: 'omc', quality: 'medium' });
  estimatedCostUsd = Math.max(estimatedCostUsd, omc.estimatedCostUsd ?? 0);
  toolCalls = Math.max(toolCalls, omc.toolCalls ?? 0);
  subagentsSpawned = Math.max(subagentsSpawned, omc.subagentsSpawned ?? 0);
  subagentsCompleted = Math.max(subagentsCompleted, omc.subagentsCompleted ?? 0);
  for (const mode of omc.agentModes ?? []) agentModes.add(mode);
  return finalize({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
}

function codexTokenTotal(info: Record<string, unknown>): number {
  const direct = numeric(info.total_tokens) || numeric(info.total);
  if (direct) return direct;
  const total = asRecord(info.total_token_usage) ?? asRecord(info.token_usage) ?? info;
  const nestedDirect = numeric(total.total_tokens) || numeric(total.total);
  if (nestedDirect) return nestedDirect;
  return numeric(total.input_tokens) + numeric(total.cached_input_tokens) + numeric(total.cache_read_input_tokens) + numeric(total.cache_creation_input_tokens) + numeric(total.output_tokens);
}

async function parseCodexSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = parseJsonlRecords(await readFile(sessionFile, 'utf8'));
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  const files = new Map<string, ChangedFileSummary>();
  const commands = new Map<string, { command: string; test: boolean }>();
  let tokensUsed = 0;
  let durationSeconds: number | null = null;
  let estimatedCostUsd = 0;
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  const pendingSubagentCalls = new Map<string, { failed: boolean }>();
  let subagentsSpawned = 0;
  let subagentsCompleted = 0;
  let agentTurns = 0;
  let sessionId: string | null = null;
  let model: string | null = null;
  let matchedWindowRow = false;
  let tokenBaselineBeforeWindow: number | null = null;
  const failedToolOutputCallIds = new Set<string>();
  const patchTextFallbacks: { callId: string | null; patchText: string; failed: boolean }[] = [];
  const sinceMillis = parseBoundaryMillis(effectiveWindow?.since);

  for (const row of rows) {
    const payload = asRecord(row.payload);
    if (!payload) continue;
    if (row?.type === 'session_meta') {
      sessionId ??= asString(payload.id);
      model ??= asString(payload.model);
    }
    if (row?.type === 'turn_context') {
      model ??= asString(payload.model);
    }
    if (payload.type === 'token_count') {
      const info = asRecord(payload.info);
      const rowMillis = rowTimestampMillis(row);
      if (info && sinceMillis != null && rowMillis != null && rowMillis < sinceMillis) {
        tokenBaselineBeforeWindow = Math.max(tokenBaselineBeforeWindow ?? 0, codexTokenTotal(info));
      }
    }
    if (!rowInAgentCollectionWindow(row, effectiveWindow)) continue;
    matchedWindowRow = true;
    estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(row) ?? 0, explicitCostUsd(payload) ?? 0);
    if (payload.type === 'agent_message') agentTurns += 1;
    if (payload.type === 'mcp_tool_call_end') toolCalls += 1;
    if (payload.type === 'token_count') {
      const info = asRecord(payload.info);
      if (info) {
        tokensUsed = Math.max(tokensUsed, codexTokenTotal(info));
        estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(info) ?? 0);
      }
    }
    if (payload.type === 'function_call') {
      toolCalls += 1;
      const callId = asString(payload.call_id);
      if (payload.name === 'spawn_agent') {
        if (callId) pendingSubagentCalls.set(callId, { failed: false });
        else subagentsSpawned += 1;
      }
      if (payload.name === 'exec_command') {
        const argsText = asString(payload.arguments);
        const args = argsText ? asRecord(safeJsonParse(argsText)) : null;
        const command = asString(args?.cmd) ?? '';
        if (callId && command) {
          commandsRun += 1;
          const test = isTestCommand(command);
          if (test) testsRun += 1;
          commands.set(callId, { command, test });
        }
      }
    }
    if (payload.type === 'custom_tool_call') toolCalls += 1;
    if (payload.type === 'function_call_output') {
      const callId = asString(payload.call_id);
      const pendingSubagent = callId ? pendingSubagentCalls.get(callId) : null;
      if (pendingSubagent && (failedStatus(payload.status) || toolOutputFailed(asString(payload.output) ?? ''))) {
        pendingSubagent.failed = true;
      }
      if (callId && (failedStatus(payload.status) || toolOutputFailed(asString(payload.output) ?? ''))) {
        failedToolOutputCallIds.add(callId);
        for (const fallback of patchTextFallbacks) {
          if (fallback.callId === callId) fallback.failed = true;
        }
      }
      const command = callId ? commands.get(callId) : null;
      if (command && commandFailed(asString(payload.output) ?? '')) {
        failedCommands += 1;
        if (command.test) failedTestCommands += 1;
      }
    }
    if (payload.type === 'custom_tool_call' && payload.name === 'apply_patch' && !failedStatus(payload.status)) {
      const patchText = asString(payload.input);
      const callId = asString(payload.call_id);
      if (patchText) patchTextFallbacks.push({ callId, patchText, failed: Boolean(callId && failedToolOutputCallIds.has(callId)) });
    }
    if (payload.type === 'patch_apply_end' && !failedStatus(payload.status)) {
      const changes = asRecord(payload.changes);
      if (!changes) continue;
      for (const [absolutePath, changeRaw] of Object.entries(changes)) {
        const rel = relativeProjectPath(cwd, absolutePath);
        if (!rel) continue;
        const change = asRecord(changeRaw) ?? {};
        const kind = asString(change.type);
        let added = 0;
        let removed = 0;
        const diff = asString(change.unified_diff);
        if (diff) {
          const counts = countUnifiedDiff(diff);
          added = counts.added;
          removed = counts.removed;
        } else {
          added = countTextLines(asString(change.content) ?? '');
        }
        upsertFile(files, rel, { status: kind === 'add' ? 'added' : kind === 'delete' ? 'deleted' : 'modified', added, removed });
      }
    }
  }
  for (const subagent of pendingSubagentCalls.values()) {
    if (!subagent.failed) subagentsSpawned += 1;
  }
  if (hasCollectionWindowBoundary(effectiveWindow) && !matchedWindowRow) return null;
  if (patchTextFallbacks.length) {
    for (const { patchText, failed } of patchTextFallbacks) {
      if (failed) continue;
      const fallbackFiles = new Map<string, ChangedFileSummary>();
      applyCodexPatchText(cwd, patchText, fallbackFiles);
      for (const file of fallbackFiles.values()) {
        if (!files.has(file.path)) files.set(file.path, file);
      }
    }
  }
  if (tokenBaselineBeforeWindow != null && tokensUsed >= tokenBaselineBeforeWindow) {
    tokensUsed -= tokenBaselineBeforeWindow;
  }
  const collectionSources: CollectionSource[] = [{ type: 'agent_session', name: 'codex', quality: 'high' }];
  const omx = await readOmxMetadata(cwd, sessionId);
  if (omx.detected) pushSource(collectionSources, { type: 'plugin_metadata', name: 'omx', quality: 'medium' });
  if (!hasCollectionWindowBoundary(effectiveWindow)) tokensUsed = Math.max(tokensUsed, omx.tokensUsed ?? 0);
  estimatedCostUsd = Math.max(estimatedCostUsd, omx.estimatedCostUsd ?? 0);
  subagentsSpawned = Math.max(subagentsSpawned, omx.subagentsSpawned ?? 0);
  subagentsCompleted = Math.max(subagentsCompleted, omx.subagentsCompleted ?? 0);
  agentTurns = Math.max(agentTurns, omx.agentTurns ?? 0);
  for (const mode of omx.agentModes ?? []) agentModes.add(mode);
  return finalize({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
}

function geminiTokenTotal(tokens: Record<string, unknown>): number {
  const total = numeric(tokens.total);
  if (total) return total;
  return numeric(tokens.input) + numeric(tokens.cached) + numeric(tokens.output) + numeric(tokens.thoughts) + numeric(tokens.tool);
}

async function parseGeminiSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = parseJsonlRecords(await readFile(sessionFile, 'utf8'));
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  const files = new Map<string, ChangedFileSummary>();
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  let sessionId: string | null = null;
  let model: string | null = null;
  let tokensUsed = 0;
  let estimatedCostUsd = 0;
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  let startMillis: number | null = null;
  let endMillis: number | null = null;
  let subagentsSpawned = 0;
  let agentTurns = 0;
  let matchedWindowRow = false;
  const sinceMillis = parseBoundaryMillis(effectiveWindow?.since);
  const untilMillis = parseBoundaryMillis(effectiveWindow?.until);

  for (const row of rows) {
    sessionId ??= asString(row.sessionId);
    model ??= asString(row.model);
    if (!rowInAgentCollectionWindow(row, effectiveWindow)) continue;
    matchedWindowRow = true;
    if (row.type === 'gemini') agentTurns += 1;
    estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(row) ?? 0);
    const rowStartMillis = parseIsoMillis(row.startTime) ?? rowTimestampMillis(row);
    const rowEndMillis = parseIsoMillis(row.lastUpdated) ?? parseIsoMillis(row.timestamp) ?? rowStartMillis;
    if (rowStartMillis != null) {
      const effectiveStart = sinceMillis != null ? Math.max(rowStartMillis, sinceMillis) : rowStartMillis;
      startMillis = Math.min(startMillis ?? effectiveStart, effectiveStart);
    }
    if (rowEndMillis != null) {
      const effectiveEnd = untilMillis != null ? Math.min(rowEndMillis, untilMillis) : rowEndMillis;
      endMillis = Math.max(endMillis ?? effectiveEnd, effectiveEnd);
    }
    const tokens = asRecord(row.tokens);
    if (tokens) {
      tokensUsed += geminiTokenTotal(tokens);
      estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(tokens) ?? 0);
    }
    const calls = Array.isArray(row.toolCalls) ? row.toolCalls : [];
    for (const callRaw of calls) {
      const call = asRecord(callRaw);
      if (!call) continue;
      toolCalls += 1;
      const name = asString(call.name);
      const args = asRecord(call.args) ?? {};
      const status = asString(call.status);
      const failed = failedStatus(status);
      if (name === 'activate_skill') {
        const skill = asString(args.name) ?? asString(args.skill_name) ?? asString(args.skillName);
        if (skill && !failed) skills.add(skill);
      } else if (name === 'write_file') {
        if (!failed) {
          const rel = relativeProjectPath(cwd, asString(args.file_path) ?? '');
          if (rel) upsertFile(files, rel, { status: 'added', added: countTextLines(asString(args.content) ?? ''), removed: 0 });
        }
      } else if (name === 'replace') {
        if (!failed) {
          const rel = relativeProjectPath(cwd, asString(args.file_path) ?? '');
          if (rel) upsertFile(files, rel, { status: 'modified', added: countTextLines(asString(args.new_string) ?? ''), removed: countTextLines(asString(args.old_string) ?? '') });
        }
      } else if (name === 'run_shell_command') {
        commandsRun += 1;
        const command = asString(args.command) ?? '';
        const commandDidFail = failed || commandFailed(asString(call.resultDisplay) ?? '');
        if (commandDidFail) failedCommands += 1;
        if (isTestCommand(command)) {
          testsRun += 1;
          if (commandDidFail) failedTestCommands += 1;
        }
      } else if (name === 'invoke_agent') {
        if (!failed) subagentsSpawned += 1;
      } else if (name === 'update_topic') {
        if (!failed) agentModes.add('superpowers');
      }
    }
  }
  if (hasCollectionWindowBoundary(effectiveWindow) && !matchedWindowRow) return null;
  const durationSeconds = startMillis && endMillis && endMillis > startMillis ? (endMillis - startMillis) / 1000 : null;
  const collectionSources: CollectionSource[] = [{ type: 'agent_session', name: 'gemini_cli', quality: 'high' }];
  if (skills.size || agentModes.has('superpowers')) pushSource(collectionSources, { type: 'plugin_metadata', name: 'superpowers', quality: 'medium' });
  return finalize({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted: subagentsSpawned, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
}


function firstInteger(record: Record<string, unknown>, keys: string[]): number | null {
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

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
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
  const normalizedPath = rawPath.startsWith('file://') ? decodeURIComponent(rawPath.slice('file://'.length)) : rawPath;
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

function applyGenericRecord(record: Record<string, unknown>, acc: {
  sessionId: string | null;
  model: string | null;
  tokensUsed: number;
  estimatedCostUsd: number;
  commandsRun: number;
  toolCalls: number;
  agentTurns: number;
  agentModes: Set<string>;
}, cwd: string, files: Map<string, ChangedFileSummary>) {
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
  const files: Array<{ path: string; mtime: number }> = [];
  async function walk(current: string, depth: number) {
    if (depth < 0) return;
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path, depth - 1);
      else if (entry.isFile() && /\.(json|jsonl|log)$/i.test(entry.name)) {
        try { files.push({ path, mtime: (await stat(path)).mtimeMs }); } catch { /* ignore */ }
      }
    }
  }
  for (const root of roots) await walk(join(cwd, root), 3);
  return files.sort((a, b) => b.mtime - a.mtime).slice(0, 20).map((row) => row.path);
}

async function parseGenericMetadata(cwd: string, sessionFile?: string | null, window?: CollectionWindow | null, options: { sourceName?: string; roots?: string[]; quality?: CollectionQuality } = {}): Promise<AgentSessionMetrics | null> {
  const acc = { sessionId: null as string | null, model: null as string | null, tokensUsed: 0, estimatedCostUsd: 0, commandsRun: 0, toolCalls: 0, agentTurns: 0, agentModes: new Set<string>() };
  const changedFiles = new Map<string, ChangedFileSummary>();
  const metadataFiles = sessionFile ? [sessionFile] : await genericMetadataFiles(cwd, options.roots);
  const includeMissingTimestamp = !hasCollectionWindowBoundary(window);
  for (const file of metadataFiles) {
    for (const record of await genericRecordsFromFile(file)) {
      if (rowInCollectionWindow(record, window, { includeMissingTimestamp })) applyGenericRecord(record, acc, cwd, changedFiles);
    }
  }
  return finalize({
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

function claudeProjectDirName(cwd: string): string {
  return resolve(cwd).replace(/\//g, '-');
}

async function newestJsonlUnder(dir: string, limit = 80): Promise<string[]> {
  async function walk(current: string, depth: number): Promise<Array<{ path: string; mtime: number }>> {
    if (depth < 0) return [];
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return []; }
    const rows: Array<{ path: string; mtime: number }> = [];
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) rows.push(...await walk(path, depth - 1));
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try { rows.push({ path, mtime: (await stat(path)).mtimeMs }); } catch { /* ignore */ }
      }
    }
    return rows;
  }
  return (await walk(dir, 5)).sort((a, b) => b.mtime - a.mtime).slice(0, limit).map((row) => row.path);
}

async function discoverSessionFile(cwd: string, source: AgentType): Promise<string | null> {
  const home = homedir();
  const candidates: string[] = [];
  if (source === 'claude_code') {
    candidates.push(...await newestJsonlUnder(join(home, '.claude', 'projects', claudeProjectDirName(cwd)), 20));
    candidates.push(...await newestJsonlUnder(join(home, '.claude', 'projects'), 80));
  } else if (source === 'codex') {
    candidates.push(...await newestJsonlUnder(join(home, '.codex', 'sessions'), 120));
  } else if (source === 'gemini_cli') {
    for (const tmpProject of await readdir(join(home, '.gemini', 'tmp'), { withFileTypes: true }).catch(() => [])) {
      if (tmpProject.isDirectory()) candidates.push(...await newestJsonlUnder(join(home, '.gemini', 'tmp', tmpProject.name, 'chats'), 20));
    }
  } else {
    return null;
  }
  for (const candidate of [...new Set(candidates)]) {
    if (source === 'gemini_cli') {
      const projectRoot = await readFile(join(dirname(dirname(candidate)), '.project_root'), 'utf8').catch(() => '');
      if (resolve(projectRoot.trim()) === resolve(cwd)) return candidate;
      continue;
    }
    if (await sessionFileBelongsToProject(candidate, cwd).catch(() => false)) return candidate;
  }
  return null;
}

export async function collectAgentSessionMetrics(options: CollectAgentSessionOptions): Promise<AgentSessionMetrics | null> {
  const sessionFile = options.sessionFile ? resolve(options.cwd, options.sessionFile) : await discoverSessionFile(options.cwd, options.source);
  if (sessionFile && !(await sessionFileMayBelongToProject(sessionFile, options.cwd))) return null;
  if (options.source === 'other') return parseGenericMetadata(options.cwd, sessionFile, { since: options.since, until: options.until });
  if (options.source === 'cursor') return parseGenericMetadata(options.cwd, sessionFile, { since: options.since, until: options.until }, { sourceName: 'cursor', roots: ['.cursor'] });
  if (!sessionFile || basename(sessionFile).startsWith('.')) return null;
  if (options.source === 'claude_code') return parseClaudeSessionFile(options.cwd, sessionFile, { since: options.since, until: options.until }, options.inferIdleGap ?? true);
  if (options.source === 'codex') return parseCodexSessionFile(options.cwd, sessionFile, { since: options.since, until: options.until }, options.inferIdleGap ?? true);
  if (options.source === 'gemini_cli') return parseGeminiSessionFile(options.cwd, sessionFile, { since: options.since, until: options.until }, options.inferIdleGap ?? true);
  return null;
}
