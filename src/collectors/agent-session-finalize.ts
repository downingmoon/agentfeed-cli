import type {
  ChangedFileSummary,
  CollectionQuality,
  CollectionSource,
  CollectionWindow,
  CollectionWindowReason,
  WorklogMetrics
} from '../types.js';

export interface AgentSessionMetrics extends WorklogMetrics {
  session_id?: string | null;
  model?: string | null;
  changed_files: ChangedFileSummary[];
  collection_window?: CollectionWindow | null;
  collection_window_reason?: CollectionWindowReason | null;
}

function mergeQuality(sources: CollectionSource[]): CollectionQuality | null {
  if (sources.some((source) => source.quality === 'high')) return 'high';
  if (sources.some((source) => source.quality === 'medium')) return 'medium';
  if (sources.some((source) => source.quality === 'low')) return 'low';
  return null;
}

export function finalizeAgentSession(input: {
  readonly sessionId?: string | null;
  readonly model?: string | null;
  readonly files: Map<string, ChangedFileSummary>;
  readonly tokensUsed: number;
  readonly durationSeconds?: number | null;
  readonly testsRun: number;
  readonly testsPassed?: number;
  readonly failedCommands: number;
  readonly failedTestCommands?: number;
  readonly commandsRun?: number;
  readonly toolCalls?: number;
  readonly estimatedCostUsd?: number | null;
  readonly skills?: Set<string>;
  readonly subagentsSpawned?: number;
  readonly subagentsCompleted?: number;
  readonly agentTurns?: number;
  readonly agentModes?: Set<string>;
  readonly collectionSources?: CollectionSource[];
  readonly collectionWindow?: CollectionWindow | null;
  readonly collectionWindowReason?: CollectionWindowReason | null;
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
    tests_passed: input.testsRun ? input.testsPassed ?? Math.max(input.testsRun - (input.failedTestCommands ?? 0), 0) : null,
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
