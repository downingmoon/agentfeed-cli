import type { ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { readSessionJsonlRecords } from './agent-session-files.js';
import { readOmxMetadata } from './agent-session-codex-omx.js';
import { applyCodexPatchText } from './agent-session-codex-patch.js';
import { codexCallArguments, codexNestedToolName, codexNestedToolParameters, codexTokenTotal } from './agent-session-codex-tools.js';
import { applyShellFileEvidence } from './agent-session-shell-files.js';
import { commandFailed, failedStatus, isTestCommand, toolOutputFailed } from './agent-session-tooling.js';
import { asRecord, asString, countTextLines, countUnifiedDiff, explicitCostUsd, finalizeAgentSession, inferEffectiveCollectionWindow, pushSource, relativeProjectPath, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { hasCollectionWindowBoundary, parseBoundaryMillis, rowInAgentCollectionWindow, rowTimestampMillis } from './agent-session-window.js';

type CodexCommandInvocation = {
  readonly command: string;
  readonly workdir: string | null;
};

type CodexCommandRecord = {
  readonly invocations: CodexCommandInvocation[];
  readonly test: boolean;
};

export async function parseCodexSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  const files = new Map<string, ChangedFileSummary>();
  const commands = new Map<string, CodexCommandRecord>();
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
  const registerCommand = (callId: string | null, command: string, workdir: string | null) => {
    if (!command) return;
    commandsRun += 1;
    const test = isTestCommand(command);
    if (test) testsRun += 1;
    if (!callId) return;
    const existing = commands.get(callId);
    commands.set(callId, {
      invocations: [...(existing?.invocations ?? []), { command, workdir }],
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
  const patchTextFromToolInput = (args: Record<string, unknown> | null, rawInput: string | null): string | null => {
    const structured = asString(args?.input) ?? asString(args?.patch) ?? asString(args?.content);
    if (structured) return structured;
    return rawInput?.startsWith('*** Begin Patch') ? rawInput : null;
  };
  const registerPatchFallback = (callId: string | null, patchText: string | null): void => {
    if (!patchText) return;
    patchTextFallbacks.push({ callId, patchText, failed: Boolean(callId && failedToolOutputCallIds.has(callId)) });
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
      const name = codexNestedToolName(payload.name);
      const callId = asString(payload.call_id);
      if (name === 'parallel') {
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
            registerCommand(callId, asString(parameters.cmd) ?? asString(parameters.command) ?? '', asString(parameters.workdir));
          } else if (nestedName === 'apply_patch') {
            registerPatchFallback(callId, patchTextFromToolInput(parameters, asString(toolUse.arguments)));
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
        registerCommand(callId, asString(args?.cmd) ?? asString(args?.command) ?? '', asString(args?.workdir));
      }
      if (name === 'apply_patch' && !failedStatus(payload.status)) {
        const args = codexCallArguments(payload);
        registerPatchFallback(callId, patchTextFromToolInput(args, asString(payload.arguments)));
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
      const output = asString(payload.output) ?? '';
      const commandDidFail = failedStatus(payload.status) || commandFailed(output);
      if (command && commandDidFail) {
        failedCommands += 1;
        if (command.test) failedTestCommands += 1;
      }
      if (command && !commandDidFail) {
        for (const invocation of command.invocations) {
          applyShellFileEvidence(cwd, { command: invocation.command, workdir: invocation.workdir, output }, files);
        }
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
