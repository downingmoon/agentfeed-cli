import type { ChangedFileSummary, CollectionSource, CollectionWindow } from '../types.js';
import { asRecord, asString, countTextLines, explicitCostUsd, finalizeAgentSession, inferEffectiveCollectionWindow, numeric, pushSource, relativeProjectPath, upsertFile, type AgentSessionMetrics } from './agent-session-core.js';
import { readSessionJsonlRecords } from './agent-session-files.js';
import { readOmcMetadata } from './agent-session-claude-omc.js';
import { commandFailed, isTestCommand, toolOutputFailed, toolResultOutput } from './agent-session-tooling.js';
import { applyShellFileEvidence } from './agent-session-shell-files.js';
import { recordTestCommandResult } from './agent-session-test-metrics.js';
import { hasCollectionWindowBoundary, rowInAgentCollectionWindow } from './agent-session-window.js';

export async function parseClaudeSessionFile(cwd: string, sessionFile: string, window?: CollectionWindow | null, inferIdleGap = true): Promise<AgentSessionMetrics | null> {
  const rows = await readSessionJsonlRecords(sessionFile);
  if (!rows) return null;
  const effective = inferEffectiveCollectionWindow(rows, window, { inferIdleGap });
  const effectiveWindow = effective.window;
  const files = new Map<string, ChangedFileSummary>();
  const commands = new Map<string, { command: string; test: boolean; workdir: string | null }>();
  const pendingFileEdits = new Map<string, { path: string; status: ChangedFileSummary['status']; added: number; removed: number; confirmed: boolean; failed: boolean }>();
  let tokensUsed = 0;
  let durationSeconds: number | null = null;
  let estimatedCostUsd = 0;
  const testMetrics = { testsRun: 0, testsPassed: 0 };
  let failedCommands = 0;
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
        const output = toolResultOutput(item);
        if (pendingFileEdit) {
          pendingFileEdit.confirmed = true;
          if (item.is_error === true || toolOutputFailed(output)) pendingFileEdit.failed = true;
        }
        const command = toolUseId ? commands.get(toolUseId) : null;
        const commandDidFail = item.is_error === true || commandFailed(output);
        if (command && commandDidFail) {
          failedCommands += 1;
        }
        if (command?.test) recordTestCommandResult(testMetrics, output, commandDidFail);
        if (command && !commandDidFail) {
          applyShellFileEvidence(cwd, { command: command.command, workdir: command.workdir, output }, files);
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
        if (toolUseId) pendingFileEdits.set(toolUseId, { path: rel, status, added, removed, confirmed: false, failed: false });
        else upsertFile(files, rel, { status, added, removed });
      }
      if (name === 'Bash') {
        const command = asString(input.command) ?? '';
        commandsRun += 1;
        const test = isTestCommand(command);
        const toolUseId = asString(item.id);
        if (toolUseId && command) commands.set(toolUseId, { command, test, workdir: asString(input.workdir) });
        else if (test) recordTestCommandResult(testMetrics, '', false);
      }
      if (name === 'Skill') {
        const skill = asString(input.skill);
        if (skill) skills.add(skill);
      }
      if (name === 'Agent' || name === 'Task') subagentsSpawned += 1;
    }
  }
  for (const edit of pendingFileEdits.values()) {
    if (edit.confirmed && !edit.failed) upsertFile(files, edit.path, { status: edit.status, added: edit.added, removed: edit.removed });
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
  return finalizeAgentSession({ sessionId, model, files, tokensUsed, estimatedCostUsd, durationSeconds, testsRun: testMetrics.testsRun, testsPassed: testMetrics.testsPassed, failedCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes, collectionSources, collectionWindow: effectiveWindow, collectionWindowReason: effective.reason });
}
