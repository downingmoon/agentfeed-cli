import type { ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { readSessionJsonlRecords } from './agent-session-files.js';
import { asRecord, asString, countTextLines, explicitCostUsd, finalizeAgentSession, inferEffectiveCollectionWindow, numeric, pushSource, relativeProjectPath, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { hasCollectionWindowBoundary, parseBoundaryMillis, parseIsoMillis, rowInAgentCollectionWindow, rowTimestampMillis } from './agent-session-window.js';
import { commandFailed, failedStatus, isTestCommand } from './agent-session-tooling.js';

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