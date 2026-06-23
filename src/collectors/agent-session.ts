import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { AgentType, ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { parseGenericMetadata } from './agent-session-generic.js';
import { discoverSessionFile, readSessionJsonlRecords, sessionFileMayBelongToProject } from './agent-session-files.js';
import { asRecord, asString, countTextLines, countUnifiedDiff, explicitCostUsd, finalizeAgentSession, finiteNumber, inferEffectiveCollectionWindow, integer, numeric, pushSource, relativeProjectPath, safeJsonParse, statusForPatchHeader, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { hasCollectionWindowBoundary, parseBoundaryMillis, parseIsoMillis, rowInAgentCollectionWindow, rowTimestampMillis } from './agent-session-window.js';

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

function codexTokenTotal(info: Record<string, unknown>): number {
  const direct = numeric(info.total_tokens) || numeric(info.total);
  if (direct) return direct;
  const total = asRecord(info.total_token_usage) ?? asRecord(info.token_usage) ?? info;
  const nestedDirect = numeric(total.total_tokens) || numeric(total.total);
  if (nestedDirect) return nestedDirect;
  return numeric(total.input_tokens) + numeric(total.cached_input_tokens) + numeric(total.cache_read_input_tokens) + numeric(total.cache_creation_input_tokens) + numeric(total.output_tokens);
}

function codexCallArguments(call: Record<string, unknown>): Record<string, unknown> | null {
  const direct = asRecord(call.arguments);
  if (direct) return direct;
  const argsText = asString(call.arguments);
  return argsText ? asRecord(safeJsonParse(argsText)) : null;
}

function codexNestedToolName(value: unknown): string | null {
  const name = asString(value);
  if (!name) return null;
  const parts = name.split('.');
  return parts[parts.length - 1] || name;
}

function codexNestedToolParameters(toolUse: Record<string, unknown>): Record<string, unknown> {
  const direct = asRecord(toolUse.parameters) ?? asRecord(toolUse.args) ?? asRecord(toolUse.arguments);
  if (direct) return direct;
  const argsText = asString(toolUse.arguments);
  return argsText ? asRecord(safeJsonParse(argsText)) ?? {} : {};
}

async function parseCodexSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
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
  const pendingSubagentCalls = new Map<string, { failed: boolean; count: number }>();
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
  const registerCommand = (callId: string | null, command: string) => {
    if (!command) return;
    commandsRun += 1;
    const test = isTestCommand(command);
    if (test) testsRun += 1;
    if (!callId) return;
    const existing = commands.get(callId);
    commands.set(callId, {
      command: existing?.command ? `${existing.command}\n${command}` : command,
      test: Boolean(existing?.test || test)
    });
  };
  const trackSubagentCall = (callId: string | null) => {
    if (!callId) {
      subagentsSpawned += 1;
      return;
    }
    const existing = pendingSubagentCalls.get(callId);
    if (existing) existing.count += 1;
    else pendingSubagentCalls.set(callId, { failed: false, count: 1 });
  };

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
      const name = asString(payload.name);
      const callId = asString(payload.call_id);
      if (name === 'multi_tool_use.parallel') {
        const args = codexCallArguments(payload);
        const toolUses = Array.isArray(args?.tool_uses) ? args.tool_uses : [];
        if (!toolUses.length) {
          toolCalls += 1;
          continue;
        }
        toolCalls += toolUses.length;
        for (const toolUseRaw of toolUses) {
          const toolUse = asRecord(toolUseRaw);
          if (!toolUse) continue;
          const nestedName = codexNestedToolName(toolUse.recipient_name ?? toolUse.name);
          const parameters = codexNestedToolParameters(toolUse);
          if (nestedName === 'spawn_agent') {
            trackSubagentCall(callId);
          } else if (nestedName === 'exec_command') {
            registerCommand(callId, asString(parameters.cmd) ?? asString(parameters.command) ?? '');
          }
        }
        continue;
      }
      toolCalls += 1;
      if (name === 'spawn_agent') {
        trackSubagentCall(callId);
      }
      if (name === 'exec_command') {
        const args = codexCallArguments(payload);
        registerCommand(callId, asString(args?.cmd) ?? asString(args?.command) ?? '');
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
    if (!subagent.failed) subagentsSpawned += subagent.count;
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
  return finalizeAgentSession({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
}

function geminiTokenTotal(tokens: Record<string, unknown>): number {
  const total = numeric(tokens.total);
  if (total) return total;
  return numeric(tokens.input) + numeric(tokens.cached) + numeric(tokens.output) + numeric(tokens.thoughts) + numeric(tokens.tool);
}

async function parseGeminiSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
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
  return finalizeAgentSession({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted: subagentsSpawned, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
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
