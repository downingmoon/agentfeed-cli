import type { ChangedFileSummary, CollectionSource, CollectionWindow, CollectionWindowReason } from '../types.js';
import { basename, dirname } from 'node:path';
import { asRecord, asString, finalizeAgentSession, relativeProjectPath, safeJsonParse, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { applyShellFileEvidence } from './agent-session-shell-files.js';
import { failedStatus, isTestCommand } from './agent-session-tooling.js';
import { hasCollectionWindowBoundary, rowInAgentCollectionWindow } from './agent-session-window.js';

type AntigravityCommand = {
  readonly command: string;
  readonly workdir: string | null;
  readonly test: boolean;
};

function unquotedAntigravityString(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  if (text.startsWith('"')) {
    const parsed = safeJsonParse(text);
    return typeof parsed === 'string' && parsed.length ? parsed : text;
  }
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1);
  return text;
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
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  let agentTurns = 0;
  let matchedWindowRow = false;

  for (const row of rows) {
    model ??= asString(row.model);
    if (!rowInAgentCollectionWindow(row, effectiveWindow)) continue;
    matchedWindowRow = true;
    const rowType = asString(row.type);
    const content = asString(row.content) ?? '';
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
            if (test) testsRun += 1;
            pendingCommands.push({ command, workdir, test });
            applyShellFileEvidence(cwd, { command, workdir, output: null }, files);
          }
        }
      }
      continue;
    }
    if (rowType === 'CODE_ACTION') {
      if (!failedStatus(asString(row.status))) {
        toolCalls += 1;
        applyAntigravityCodeAction(cwd, content, files);
      }
      continue;
    }
    if (rowType === 'RUN_COMMAND') {
      if (asString(row.status) === 'RUNNING') continue;
      const pending = pendingCommands.shift();
      if (!pending) continue;
      const failed = antigravityCommandFailed(row, content);
      if (failed) {
        failedCommands += 1;
        if (pending.test) failedTestCommands += 1;
      } else {
        applyShellFileEvidence(cwd, { command: pending.command, workdir: pending.workdir, output: content }, files);
      }
    }
  }
  if (hasCollectionWindowBoundary(effectiveWindow) && !matchedWindowRow) return null;
  const collectionSources: CollectionSource[] = [
    { type: 'agent_session', name: 'gemini_cli', quality: 'high' },
    { type: 'agent_session', name: 'antigravity_cli', quality: 'high' }
  ];
  return finalizeAgentSession({ sessionId: antigravitySessionId(sessionFile), model, files, tokensUsed: 0, estimatedCostUsd: 0, durationSeconds: null, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned: 0, subagentsCompleted: 0, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effectiveReason });
}
