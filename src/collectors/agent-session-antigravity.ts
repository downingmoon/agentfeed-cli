import type { ChangedFileSummary, CollectionSource, CollectionWindow, CollectionWindowReason } from '../types.js';
import { basename, dirname } from 'node:path';
import { asRecord, asString, explicitCostUsd, numeric, relativeProjectPath, upsertFile } from './agent-session-core.js';
import { antigravitySubagentIds, completedAntigravitySubagentId, countAntigravitySubagentSpecs, unquotedAntigravityString } from './agent-session-antigravity-values.js';
import { finalizeAgentSession, type AgentSessionMetrics } from './agent-session-finalize.js';
import { applyShellFileEvidence } from './agent-session-shell-files.js';
import { recordTestCommandResult } from './agent-session-test-metrics.js';
import { failedStatus, isTestCommand, toolOutputFailed } from './agent-session-tooling.js';
import { hasCollectionWindowBoundary, parseBoundaryMillis, rowInAgentCollectionWindow, rowTimestampMillis } from './agent-session-window.js';

type AntigravityCommand = {
  readonly command: string;
  readonly workdir: string | null;
  readonly test: boolean;
};

type OrderedAntigravityRow = {
  readonly row: Record<string, unknown>;
  readonly index: number;
};

function antigravityStepIndex(row: Record<string, unknown>): number | null {
  return typeof row.step_index === 'number' && Number.isFinite(row.step_index) ? row.step_index : null;
}

function compareOrderedAntigravityRows(left: OrderedAntigravityRow, right: OrderedAntigravityRow): number {
  const leftStep = antigravityStepIndex(left.row);
  const rightStep = antigravityStepIndex(right.row);
  if (leftStep != null && rightStep != null && leftStep !== rightStep) return leftStep - rightStep;
  if (leftStep != null && rightStep == null) return -1;
  if (leftStep == null && rightStep != null) return 1;
  const leftMillis = rowTimestampMillis(left.row);
  const rightMillis = rowTimestampMillis(right.row);
  if (leftMillis != null && rightMillis != null && leftMillis !== rightMillis) return leftMillis - rightMillis;
  return left.index - right.index;
}

function orderedAntigravityRows(rows: readonly Record<string, unknown>[]): readonly Record<string, unknown>[] {
  return rows.map((row, index) => ({ row, index })).sort(compareOrderedAntigravityRows).map((entry) => entry.row);
}

function antigravitySessionId(sessionFile: string): string {
  const transcriptParent = dirname(dirname(dirname(sessionFile)));
  const conversationId = basename(transcriptParent);
  return conversationId && conversationId !== '.' ? conversationId : basename(sessionFile, '.jsonl');
}

export function isAntigravityTranscript(rows: readonly Record<string, unknown>[]): boolean {
  return rows.some((row) => ['PLANNER_RESPONSE', 'CODE_ACTION', 'RUN_COMMAND', 'USER_INPUT'].includes(asString(row.type) ?? ''));
}

function antigravityCommandFailed(row: Record<string, unknown>, content: string): boolean {
  return failedStatus(asString(row.status)) || /command failed|exited with code [1-9]|permission denied|error:/i.test(content);
}

function antigravityTokenTotal(tokens: Record<string, unknown>): number {
  const total = numeric(tokens.total);
  if (total) return total;
  return numeric(tokens.input) + numeric(tokens.cached) + numeric(tokens.output) + numeric(tokens.thoughts) + numeric(tokens.tool);
}

function filePathFromUri(uri: string): string {
  if (!uri.startsWith('file://')) return uri;
  try {
    return decodeURIComponent(new URL(uri).pathname);
  } catch {
    return uri.replace(/^file:\/\//, '');
  }
}

function antigravityCodeActionStatus(content: string): ChangedFileSummary['status'] {
  if (/\bdeleted file\b/i.test(content)) return 'deleted';
  if (/\brenamed file\b/i.test(content)) return 'renamed';
  if (/\bcreated file\b/i.test(content)) return 'added';
  return 'modified';
}

function applyAntigravityCodeAction(cwd: string, content: string, files: Map<string, ChangedFileSummary>): void {
  const status = antigravityCodeActionStatus(content);
  const pattern = /\b(?:Created|Modified|Updated|Edited|Deleted|Renamed) file\s+(?<uri>file:\/\/[^\s]+|\/[^\s]+|[^\s]+)\b/gi;
  for (const match of content.matchAll(pattern)) {
    const rawPath = match.groups?.uri;
    if (!rawPath) continue;
    const rel = relativeProjectPath(cwd, filePathFromUri(rawPath));
    if (rel) upsertFile(files, rel, { status, added: 0, removed: 0 });
  }
}

function antigravityToolCalls(row: Record<string, unknown>): readonly Record<string, unknown>[] {
  return Array.isArray(row.tool_calls) ? row.tool_calls.flatMap((call): Record<string, unknown>[] => {
    const record = asRecord(call);
    return record ? [record] : [];
  }) : [];
}

export function parseAntigravityTranscript(cwd: string, sessionFile: string, rows: readonly Record<string, unknown>[], effectiveWindow: CollectionWindow | null, effectiveReason: CollectionWindowReason | null): AgentSessionMetrics | null {
  const files = new Map<string, ChangedFileSummary>();
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  const pendingCommands: AntigravityCommand[] = [];
  let model: string | null = null;
  const testMetrics = { testsRun: 0, testsPassed: 0 };
  let failedCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  let agentTurns = 0;
  let plannedSubagentsSpawned = 0;
  const spawnedSubagentIds = new Set<string>();
  const completedSubagentIds = new Set<string>();
  let tokensUsed = 0;
  let estimatedCostUsd = 0;
  let startMillis: number | null = null;
  let endMillis: number | null = null;
  let matchedWindowRow = false;
  const sinceMillis = parseBoundaryMillis(effectiveWindow?.since);
  const untilMillis = parseBoundaryMillis(effectiveWindow?.until);

  for (const row of orderedAntigravityRows(rows)) {
    model ??= asString(row.model);
    if (!rowInAgentCollectionWindow(row, effectiveWindow)) continue;
    matchedWindowRow = true;
    const rowType = asString(row.type);
    const content = asString(row.content) ?? '';
    estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(row) ?? 0);
    const tokens = asRecord(row.tokens);
    if (tokens) {
      tokensUsed += antigravityTokenTotal(tokens);
      estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(tokens) ?? 0);
    }
    const rowMillis = rowTimestampMillis(row);
    if (rowMillis != null) {
      const effectiveStart = sinceMillis != null ? Math.max(rowMillis, sinceMillis) : rowMillis;
      const effectiveEnd = untilMillis != null ? Math.min(rowMillis, untilMillis) : rowMillis;
      startMillis = Math.min(startMillis ?? effectiveStart, effectiveStart);
      endMillis = Math.max(endMillis ?? effectiveEnd, effectiveEnd);
    }
    if (rowType === 'PLANNER_RESPONSE') {
      agentTurns += 1;
      for (const call of antigravityToolCalls(row)) {
        toolCalls += 1;
        const name = asString(call.name);
        const args = asRecord(call.args) ?? {};
        if (name === 'run_command') {
          const command = unquotedAntigravityString(args.CommandLine) ?? unquotedAntigravityString(args.command) ?? '';
          const workdir = unquotedAntigravityString(args.Cwd) ?? unquotedAntigravityString(args.cwd);
          if (command) {
            commandsRun += 1;
            const test = isTestCommand(command);
            pendingCommands.push({ command, workdir, test });
          }
        } else if (name === 'invoke_subagent') {
          plannedSubagentsSpawned += countAntigravitySubagentSpecs(args.Subagents);
        }
      }
      continue;
    }
    if (rowType === 'CODE_ACTION') {
      if (!failedStatus(asString(row.status)) && !toolOutputFailed(content)) {
        toolCalls += 1;
        applyAntigravityCodeAction(cwd, content, files);
      }
      continue;
    }
    if (rowType === 'INVOKE_SUBAGENT') {
      if (!failedStatus(asString(row.status)) && !toolOutputFailed(content)) {
        for (const id of antigravitySubagentIds(content)) spawnedSubagentIds.add(id);
      }
      continue;
    }
    if (rowType === 'SYSTEM_MESSAGE') {
      const completedId = completedAntigravitySubagentId(content, spawnedSubagentIds);
      if (completedId) completedSubagentIds.add(completedId);
      continue;
    }
    if (rowType === 'RUN_COMMAND') {
      if (asString(row.status) === 'RUNNING') continue;
      const pending = pendingCommands.shift();
      if (!pending) continue;
      const failed = antigravityCommandFailed(row, content);
      if (failed) {
        failedCommands += 1;
      } else {
        applyShellFileEvidence(cwd, { command: pending.command, workdir: pending.workdir, output: content }, files);
      }
      if (pending.test) recordTestCommandResult(testMetrics, content, failed);
    }
  }
  if (hasCollectionWindowBoundary(effectiveWindow) && !matchedWindowRow) return null;
  const collectionSources: CollectionSource[] = [
    { type: 'agent_session', name: 'gemini_cli', quality: 'high' },
    { type: 'agent_session', name: 'antigravity_cli', quality: 'high' }
  ];
  const durationSeconds = startMillis != null && endMillis != null && endMillis > startMillis ? (endMillis - startMillis) / 1000 : null;
  const subagentsSpawned = Math.max(plannedSubagentsSpawned, spawnedSubagentIds.size);
  return finalizeAgentSession({ sessionId: antigravitySessionId(sessionFile), model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun: testMetrics.testsRun, testsPassed: testMetrics.testsPassed, failedCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted: completedSubagentIds.size, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effectiveReason });
}
