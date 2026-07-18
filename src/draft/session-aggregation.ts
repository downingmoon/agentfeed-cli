import type { AgentFeedProjectConfig, AgentMetricSummary, AgentType, ChangedFileSummary, CollectionQuality, CollectionWindow, CollectionWindowReason, WorklogMetrics } from '../types.js';
import type { AgentSessionMetrics } from '../collectors/agent-session.js';
import { shouldIgnoreEvidencePath } from '../collectors/path-filter.js';
import { shortHash } from '../utils/hash.js';

export function mergeChangedFiles(gitFiles: ChangedFileSummary[], sessionFiles: ChangedFileSummary[]): ChangedFileSummary[] {
  const files = new Map<string, ChangedFileSummary>();
  for (const file of [...gitFiles, ...sessionFiles]) {
    if (shouldIgnoreEvidencePath(file.path)) continue;
    const current = files.get(file.path);
    if (!current) {
      files.set(file.path, { ...file });
      continue;
    }
    files.set(file.path, {
      ...current,
      extension: current.extension ?? file.extension ?? null,
      language: current.language ?? file.language ?? null,
      status: current.status === 'unknown' ? file.status : current.status,
      publish_path: current.publish_path || file.publish_path,
      lines_added: current.lines_added ?? file.lines_added ?? null,
      lines_removed: current.lines_removed ?? file.lines_removed ?? null
    });
  }
  return [...files.values()];
}

export function sumChangedFileLines(files: ChangedFileSummary[], key: 'lines_added' | 'lines_removed'): number | null {
  let total = 0;
  let seen = false;
  for (const file of files) {
    const value = file[key];
    if (value == null) continue;
    total += value;
    seen = true;
  }
  return seen ? total : null;
}

export function addOptionalCounts(...values: Array<number | null | undefined>): number | null {
  let total = 0;
  let seen = false;
  for (const value of values) {
    if (value == null) continue;
    total += value;
    seen = true;
  }
  return seen ? total : null;
}

export interface AgentSessionCandidate {
  readonly source: AgentType;
  readonly session: AgentSessionMetrics;
}

const COLLECTION_QUALITY_RANK: Record<CollectionQuality, number> = { low: 1, medium: 2, high: 3 };

function mergedCollectionQuality(sources: NonNullable<WorklogMetrics['collection_sources']>): CollectionQuality | null {
  let best: CollectionQuality | null = null;
  for (const source of sources) {
    if (!best || COLLECTION_QUALITY_RANK[source.quality] > COLLECTION_QUALITY_RANK[best]) best = source.quality;
  }
  return best;
}

function orderedCandidates(candidates: AgentSessionCandidate[], primary: AgentSessionCandidate): AgentSessionCandidate[] {
  return [
    primary,
    ...candidates
      .filter((candidate) => candidate !== primary)
      .sort((a, b) => `${a.source}:${a.session.session_id ?? ''}`.localeCompare(`${b.source}:${b.session.session_id ?? ''}`))
  ];
}

function mergeCollectionSources(candidates: AgentSessionCandidate[], primary: AgentSessionCandidate): NonNullable<WorklogMetrics['collection_sources']> {
  const sources: NonNullable<WorklogMetrics['collection_sources']> = [];
  for (const candidate of orderedCandidates(candidates, primary)) {
    for (const source of candidate.session.collection_sources ?? []) {
      if (!sources.some((row) => row.type === source.type && row.name === source.name)) sources.push(source);
    }
  }
  return sources;
}

function sessionWorkScore(candidate: AgentSessionCandidate): number {
  const session = candidate.session;
  const changedFileCount = session.files_changed ?? session.changed_files.length;
  const lineCount = (session.lines_added ?? 0) + (session.lines_removed ?? 0);
  return changedFileCount * 100_000
    + lineCount * 1_000
    + (session.tokens_used ?? 0)
    + (session.tool_calls ?? 0) * 100
    + (session.commands_run ?? 0) * 80
    + (session.agent_turns ?? 0) * 50
    + (session.subagents_spawned ?? 0) * 250;
}

function primarySessionCandidate(candidates: AgentSessionCandidate[]): AgentSessionCandidate {
  return candidates.reduce((best, candidate) => sessionWorkScore(candidate) > sessionWorkScore(best) ? candidate : best, candidates[0]);
}

function mergeAgentModes(candidates: AgentSessionCandidate[]): string[] | null {
  const modes = new Set<string>();
  for (const candidate of candidates) {
    for (const mode of candidate.session.agent_modes ?? []) modes.add(mode);
  }
  return modes.size ? [...modes].sort() : null;
}

export function sessionModelsUsed(session?: Pick<AgentSessionMetrics, 'model' | 'models_used'> | null): string[] {
  const models = new Set<string>();
  for (const model of session?.models_used ?? []) {
    if (model) models.add(model);
  }
  if (session?.model) models.add(session.model);
  return [...models];
}

function mergeModelsUsed(candidates: AgentSessionCandidate[]): string[] | null {
  const models = new Set<string>();
  for (const candidate of candidates) {
    for (const model of sessionModelsUsed(candidate.session)) models.add(model);
  }
  return models.size ? [...models].sort() : null;
}

function agentMetricForCandidate(candidate: AgentSessionCandidate): AgentMetricSummary {
  const session = candidate.session;
  const filesChanged = session.files_changed ?? session.changed_files.length;
  return {
    agent: candidate.source,
    model: session.model ?? null,
    session_id: session.session_id ?? null,
    tokens_used: session.tokens_used ?? null,
    estimated_cost_usd: session.estimated_cost_usd ?? null,
    duration_seconds: session.duration_seconds ?? null,
    files_changed: filesChanged || null,
    lines_added: session.lines_added ?? null,
    lines_removed: session.lines_removed ?? null,
    tests_run: session.tests_run ?? null,
    tests_passed: session.tests_passed ?? null,
    failed_commands: session.failed_commands ?? null,
    commands_run: session.commands_run ?? null,
    tool_calls: session.tool_calls ?? null,
    skills_used: session.skills_used ?? null,
    subagents_spawned: session.subagents_spawned ?? null,
    subagents_completed: session.subagents_completed ?? null,
    agent_turns: session.agent_turns ?? null,
    agent_modes: session.agent_modes ?? null
  };
}

function agentMetricsForCandidates(candidates: AgentSessionCandidate[], primary: AgentSessionCandidate): AgentMetricSummary[] | null {
  if (!candidates.length) return null;
  return orderedCandidates(candidates, primary).map(agentMetricForCandidate);
}

export function agentMetricsForSession(source: AgentType, session?: AgentSessionMetrics | null): AgentMetricSummary[] | null {
  if (!session) return null;
  if (session.agent_metrics?.length) return session.agent_metrics;
  return [agentMetricForCandidate({ source, session })];
}

export function configFilteredAgentMetrics(metrics: AgentMetricSummary[] | null | undefined, config: AgentFeedProjectConfig): AgentMetricSummary[] | null {
  if (!metrics?.length) return null;
  return metrics.map((metric) => ({
    ...metric,
    tokens_used: config.collection.include_token_usage ? metric.tokens_used ?? null : null,
    estimated_cost_usd: config.collection.include_estimated_cost ? metric.estimated_cost_usd ?? null : null,
    files_changed: config.collection.include_file_stats ? metric.files_changed ?? null : null,
    lines_added: config.collection.include_file_stats ? metric.lines_added ?? null : null,
    lines_removed: config.collection.include_file_stats ? metric.lines_removed ?? null : null,
    tests_run: config.collection.include_test_results ? metric.tests_run ?? null : null,
    tests_passed: config.collection.include_test_results ? metric.tests_passed ?? null : null
  }));
}

function mergeSessionWindow(candidates: AgentSessionCandidate[], fallback?: CollectionWindow | null): CollectionWindow | null {
  const windows = candidates.map((candidate) => candidate.session.collection_window).filter((window): window is CollectionWindow => Boolean(window?.since || window?.until));
  if (!windows.length) return fallback?.since || fallback?.until ? fallback : null;
  const sinceValues = windows.map((window) => window.since).filter((value): value is string => Boolean(value));
  const untilValues = windows.map((window) => window.until).filter((value): value is string => Boolean(value));
  return {
    since: sinceValues.length ? new Date(Math.min(...sinceValues.map((value) => Date.parse(value)))).toISOString() : null,
    until: untilValues.length ? new Date(Math.max(...untilValues.map((value) => Date.parse(value)))).toISOString() : null
  };
}

function mergeSessionWindowReason(candidates: AgentSessionCandidate[]): CollectionWindowReason | null {
  return candidates.some((candidate) => candidate.session.collection_window_reason === 'idle_gap') ? 'idle_gap' : null;
}

function aggregateSessionIdentity(candidates: AgentSessionCandidate[]): string | null {
  if (!candidates.length) return null;
  const identities = candidates.map((candidate) => ({
    source: candidate.source,
    session_id: candidate.session.session_id ?? null,
    model: candidate.session.model ?? null,
    window: candidate.session.collection_window ?? null,
    tokens_used: candidate.session.tokens_used ?? null,
    files_changed: candidate.session.files_changed ?? candidate.session.changed_files.length,
    tool_calls: candidate.session.tool_calls ?? null,
    agent_turns: candidate.session.agent_turns ?? null
  })).sort((a, b) => `${a.source}:${a.session_id ?? ''}`.localeCompare(`${b.source}:${b.session_id ?? ''}`));
  return shortHash(JSON.stringify(identities), 16);
}

export function mergeAgentSessions(candidates: AgentSessionCandidate[], requestedWindow?: CollectionWindow | null): { source: AgentType; session: AgentSessionMetrics; fingerprintIdentity: string | null } {
  const primary = primarySessionCandidate(candidates);
  const changedFiles = mergeChangedFiles([], candidates.flatMap((candidate) => candidate.session.changed_files));
  const linesAdded = sumChangedFileLines(changedFiles, 'lines_added');
  const linesRemoved = sumChangedFileLines(changedFiles, 'lines_removed');
  const collectionSources = mergeCollectionSources(candidates, primary);
  const collectionWindow = mergeSessionWindow(candidates, requestedWindow);
  const modelsUsed = mergeModelsUsed(candidates);
  const session: AgentSessionMetrics = {
    session_id: primary.session.session_id ?? null,
    model: primary.session.model ?? null,
    changed_files: changedFiles,
    tokens_used: addOptionalCounts(...candidates.map((candidate) => candidate.session.tokens_used)),
    estimated_cost_usd: addOptionalCounts(...candidates.map((candidate) => candidate.session.estimated_cost_usd)),
    duration_seconds: addOptionalCounts(...candidates.map((candidate) => candidate.session.duration_seconds)),
    files_changed: changedFiles.length || null,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    tests_run: addOptionalCounts(...candidates.map((candidate) => candidate.session.tests_run)),
    tests_passed: addOptionalCounts(...candidates.map((candidate) => candidate.session.tests_passed)),
    failed_commands: addOptionalCounts(...candidates.map((candidate) => candidate.session.failed_commands)),
    commands_run: addOptionalCounts(...candidates.map((candidate) => candidate.session.commands_run)),
    tool_calls: addOptionalCounts(...candidates.map((candidate) => candidate.session.tool_calls)),
    skills_used: addOptionalCounts(...candidates.map((candidate) => candidate.session.skills_used)),
    subagents_spawned: addOptionalCounts(...candidates.map((candidate) => candidate.session.subagents_spawned)),
    subagents_completed: addOptionalCounts(...candidates.map((candidate) => candidate.session.subagents_completed)),
    agent_turns: addOptionalCounts(...candidates.map((candidate) => candidate.session.agent_turns)),
    models_used: modelsUsed,
    agent_metrics: agentMetricsForCandidates(candidates, primary),
    agent_modes: mergeAgentModes(candidates),
    collection_quality: mergedCollectionQuality(collectionSources),
    collection_sources: collectionSources.length ? collectionSources : null,
    collection_window: collectionWindow,
    collection_window_reason: collectionWindow?.since ? mergeSessionWindowReason(candidates) : null
  };
  return {
    source: primary.source,
    session,
    fingerprintIdentity: candidates.length > 1 ? aggregateSessionIdentity(candidates) : null
  };
}
