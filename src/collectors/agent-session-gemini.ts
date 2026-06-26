import type { ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { basename, dirname } from 'node:path';
import { readSessionJsonlRecords } from './agent-session-files.js';
import { asRecord, asString, countTextLines, explicitCostUsd, finalizeAgentSession, inferEffectiveCollectionWindow, numeric, pushSource, relativeProjectPath, safeJsonParse, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { hasCollectionWindowBoundary, parseBoundaryMillis, parseIsoMillis, rowInAgentCollectionWindow, rowTimestampMillis } from './agent-session-window.js';
import { commandFailed, failedStatus, isTestCommand } from './agent-session-tooling.js';
import { applyShellFileEvidence } from './agent-session-shell-files.js';


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

function isAntigravityTranscript(rows: readonly Record<string, unknown>[]): boolean {
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

function parseAntigravityTranscript(cwd: string, sessionFile: string, rows: readonly Record<string, unknown>[], effectiveWindow: CollectionWindow | null, effectiveReason: ReturnType<typeof inferEffectiveCollectionWindow>['reason']): AgentSessionMetrics | null {
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

function geminiTokenTotal(tokens: Record<string, unknown>): number {
  const total = numeric(tokens.total);
  if (total) return total;
  return numeric(tokens.input) + numeric(tokens.cached) + numeric(tokens.output) + numeric(tokens.thoughts) + numeric(tokens.tool);
}

export async function parseGeminiSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  if (isAntigravityTranscript(rows)) return parseAntigravityTranscript(cwd, sessionFile, rows, effectiveWindow, effective.reason);
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
        else applyShellFileEvidence(cwd, { command, workdir: asString(args.cwd) ?? asString(args.Cwd), output: asString(call.resultDisplay) ?? '' }, files);
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