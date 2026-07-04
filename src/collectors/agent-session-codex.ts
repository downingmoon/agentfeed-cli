import { basename } from 'node:path';
import type { ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { readSessionJsonlRecords } from './agent-session-files.js';
import { readOmxMetadata } from './agent-session-codex-omx.js';
import { applyCodexPatchApplyEnd } from './agent-session-codex-patch-apply.js';
import { createCodexPatchFallbacks } from './agent-session-codex-patch-fallbacks.js';
import { createCodexCommandTracker, createCodexSubagentTracker } from './agent-session-codex-call-state.js';
import { codexCallArguments, codexNestedToolName, codexNestedToolParameters, codexPatchTextFromToolInput, codexTokenTotal } from './agent-session-codex-tools.js';
import { commandFailed, failedStatus, toolOutputFailed } from './agent-session-tooling.js';
import { asRecord, asString, explicitCostUsd, inferEffectiveCollectionWindow, pushSource } from './agent-session-core.js';
import { finalizeAgentSession, type AgentSessionMetrics } from './agent-session-finalize.js';
import { hasCollectionWindowBoundary, parseBoundaryMillis, rowInAgentCollectionWindow, rowTimestampMillis } from './agent-session-window.js';

export async function parseCodexSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  const files = new Map<string, ChangedFileSummary>();
  const commandTracker = createCodexCommandTracker();
  const subagentTracker = createCodexSubagentTracker();
  let tokensUsed = 0;
  let startMillis: number | null = null;
  let endMillis: number | null = null;
  let estimatedCostUsd = 0;
  let toolCalls = 0;
  const countedToolCallIds = new Set<string>();
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  let subagentsCompleted = 0;
  let agentTurns = 0;
  let sessionId: string | null = null;
  let model: string | null = null;
  let matchedWindowRow = false;
  let tokenBaselineBeforeWindow: number | null = null;
  const patchFallbacks = createCodexPatchFallbacks();
  const sinceMillis = parseBoundaryMillis(effectiveWindow?.since);
  const untilMillis = parseBoundaryMillis(effectiveWindow?.until);

  function recordToolCall(callId: string | null, count = 1): void {
    toolCalls += count;
    if (callId) countedToolCallIds.add(callId);
  }

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
    const rowMillis = rowTimestampMillis(row);
    if (rowMillis != null) {
      const effectiveStart = sinceMillis != null ? Math.max(rowMillis, sinceMillis) : rowMillis;
      const effectiveEnd = untilMillis != null ? Math.min(rowMillis, untilMillis) : rowMillis;
      startMillis = Math.min(startMillis ?? effectiveStart, effectiveStart);
      endMillis = Math.max(endMillis ?? effectiveEnd, effectiveEnd);
    }
    estimatedCostUsd = Math.max(estimatedCostUsd, explicitCostUsd(row) ?? 0, explicitCostUsd(payload) ?? 0);
    if (payload.type === 'agent_message') agentTurns += 1;
    if (payload.type === 'mcp_tool_call_end') {
      const callId = asString(payload.call_id);
      if (!callId || !countedToolCallIds.has(callId)) recordToolCall(callId);
    }
    if (payload.type === 'tool_search_call') recordToolCall(asString(payload.call_id));
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
          recordToolCall(callId);
          continue;
        }
        recordToolCall(callId, toolUses.length);
        for (const toolUseRaw of toolUses) {
          const toolUse = asRecord(toolUseRaw);
          if (!toolUse) continue;
          const nestedName = codexNestedToolName(toolUse.recipient_name ?? toolUse.name);
          const parameters = codexNestedToolParameters(toolUse);
          if (nestedName === 'spawn_agent') {
            subagentTracker.track(callId);
          } else if (nestedName === 'exec_command') {
            commandTracker.register(callId, asString(parameters.cmd) ?? asString(parameters.command) ?? '', asString(parameters.workdir));
          } else if (nestedName === 'write_stdin') {
            commandTracker.registerTerminalPoll(callId, codexTerminalSessionId(parameters.session_id));
          } else if (nestedName === 'apply_patch') {
            patchFallbacks.register(callId, codexPatchTextFromToolInput(parameters, asString(toolUse.arguments)), { requiresOutput: Boolean(callId) });
          }
        }
        continue;
      }
      recordToolCall(callId);
      if (name === 'spawn_agent') {
        subagentTracker.track(callId);
      }
      if (name === 'exec_command') {
        const args = codexCallArguments(payload);
        commandTracker.register(callId, asString(args?.cmd) ?? asString(args?.command) ?? '', asString(args?.workdir));
      }
      if (name === 'write_stdin') {
        const args = codexCallArguments(payload);
        commandTracker.registerTerminalPoll(callId, codexTerminalSessionId(args?.session_id));
      }
      if (name === 'apply_patch' && !failedStatus(payload.status)) {
        const args = codexCallArguments(payload);
        patchFallbacks.register(callId, codexPatchTextFromToolInput(args, asString(payload.arguments)), { requiresOutput: Boolean(callId) });
      }
    }
    if (payload.type === 'custom_tool_call') recordToolCall(asString(payload.call_id));
    if (payload.type === 'function_call_output') {
      const callId = asString(payload.call_id);
      const output = asString(payload.output) ?? '';
      const outputFailed = failedStatus(payload.status) || toolOutputFailed(output);
      subagentTracker.markOutputFailed(callId, outputFailed);
      if (callId && outputFailed) patchFallbacks.fail(callId);
      if (callId) patchFallbacks.confirm(callId);
      commandTracker.recordOutput({ cwd, callId, output, failed: failedStatus(payload.status) || commandFailed(output), files });
    }
    if (payload.type === 'custom_tool_call' && payload.name === 'apply_patch' && !failedStatus(payload.status)) {
      const patchText = asString(payload.input);
      const callId = asString(payload.call_id);
      patchFallbacks.register(callId, patchText);
    }
    if (payload.type === 'patch_apply_end' && !failedStatus(payload.status)) {
      applyCodexPatchApplyEnd(cwd, asRecord(payload.changes), files);
    }
  }
  let subagentsSpawned = subagentTracker.spawned;
  if (hasCollectionWindowBoundary(effectiveWindow) && !matchedWindowRow) return null;
  patchFallbacks.applyConfirmed(cwd, files);
  sessionId ??= codexSessionIdFromFilename(sessionFile);
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
  const durationSeconds = startMillis != null && endMillis != null && endMillis > startMillis ? (endMillis - startMillis) / 1000 : null;
  return finalizeAgentSession({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun: commandTracker.testsRun, testsPassed: commandTracker.testsPassed, failedCommands: commandTracker.failedCommands, commandsRun: commandTracker.commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
}

function codexSessionIdFromFilename(sessionFile: string): string | null {
  const match = /^rollout-.+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i.exec(basename(sessionFile));
  return match?.[1] ?? null;
}

function codexTerminalSessionId(value: unknown): string | null {
  const text = asString(value);
  if (text) return text;
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.trunc(value)) : null;
}
