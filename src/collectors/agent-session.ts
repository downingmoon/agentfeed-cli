import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { AgentType, ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { parseCodexSessionFile } from './agent-session-codex.js';
import { parseGenericMetadata } from './agent-session-generic.js';
import { parseGeminiSessionFile } from './agent-session-gemini.js';
import { discoverSessionFile, readSessionJsonlRecords, sessionFileMayBelongToProject } from './agent-session-files.js';
import { commandFailed, isTestCommand, toolResultOutput } from './agent-session-tooling.js';
import { asRecord, asString, countTextLines, explicitCostUsd, finalizeAgentSession, inferEffectiveCollectionWindow, integer, numeric, pushSource, relativeProjectPath, safeJsonParse, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { hasCollectionWindowBoundary, rowInAgentCollectionWindow } from './agent-session-window.js';

export type { AgentSessionMetrics } from './agent-session-core.js';
export { sessionFileBelongsToProject } from './agent-session-files.js';

export interface CollectAgentSessionOptions {
  readonly cwd: string;
  readonly source: AgentType;
  readonly sessionFile?: string | null;
  readonly since?: string | null;
  readonly until?: string | null;
  readonly inferIdleGap?: boolean;
}

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  return asRecord(safeJsonParse(await readFile(path, 'utf8').catch(() => '')));
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

async function parseClaudeSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
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
  return finalizeAgentSession({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
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
