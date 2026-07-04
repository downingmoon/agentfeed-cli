import { resolve } from 'node:path';
import type { AgentType, CollectionWindow, LocalDraft, WorklogMetrics } from '../types.js';
import { loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { collectGitMetrics } from '../collectors/git.js';
import { collectAgentSessionMetrics } from '../collectors/agent-session.js';
import { collectConfiguredCommandMetricsWithStatus } from '../collectors/test-command.js';
import { changedAreas } from '../summary/changed-areas.js';
import { writeDraft } from './write.js';
import { collectionFingerprint, collectionPolicyForFingerprint, findDraftByFingerprint, redactedUserNoteForFingerprint } from './collection-fingerprint.js';
import { autoAgentSources, explicitSessionProbeSources } from './agent-source-detection.js';
import { globalAgentSignalMismatchWarnings } from './session-warnings.js';
import { addOptionalCounts, agentMetricsForSession, configFilteredAgentMetrics, mergeAgentSessions, mergeChangedFiles, sessionModelsUsed, sumChangedFileLines, type AgentSessionCandidate } from './session-aggregation.js';
import { buildCollectedDraft, buildEmptyDraft } from './draft-builders.js';
import { assertExplicitSessionFileUsable, excludeSessionFileChange, relativeDraftProjectPath } from './session-file-diagnostics.js';

function normalizeBoundary(value?: string | null): string | null {
  if (!value) return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`Invalid collection window timestamp: ${value}`);
  return new Date(millis).toISOString();
}

function normalizeUserNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
}

function collectionWindow(options: { since?: string | null; until?: string | null }): CollectionWindow | null {
  const since = normalizeBoundary(options.since);
  const until = normalizeBoundary(options.until);
  if (!since && !until) return null;
  return { since, until };
}

export const createEmptyDraft = buildEmptyDraft;


export interface CollectDraftStatus {
  draft: LocalDraft;
  reusedExisting: boolean;
  warnings: string[];
}

export interface CollectDraftOptions {
  cwd: string;
  source?: AgentType;
  sessionFile?: string | null;
  since?: string | null;
  until?: string | null;
  force?: boolean;
  note?: string | null;
  inferIdleGap?: boolean;
  runConfiguredCommands?: boolean;
  skipConfiguredCommands?: boolean;
}

export async function collectDraftWithStatus(options: CollectDraftOptions): Promise<CollectDraftStatus> {
  const invocationCwd = resolve(options.cwd);
  const sessionFile = options.sessionFile ? resolve(invocationCwd, options.sessionFile) : null;
  const root = await resolveProjectRoot(invocationCwd);
  const config = await loadProjectConfig(root);
  const autoSources = await autoAgentSources(root, config);
  const enabledSources = autoSources.enabled;
  let source = options.source ?? autoSources.attributable[0] ?? 'other';
  const git = await collectGitMetrics(root);
  const window = collectionWindow(options);
  const inferIdleGap = options.inferIdleGap ?? !window?.since;
  const warnings: string[] = [...autoSources.warnings];
  let sessionFingerprintIdentity: string | null = null;
  let session = options.source
    ? await collectAgentSessionMetrics({ cwd: root, source, sessionFile, since: window?.since, until: window?.until, inferIdleGap })
    : null;
  if (!options.source) {
    const candidates: AgentSessionCandidate[] = [];
    for (const candidate of enabledSources) {
      const candidateSession = await collectAgentSessionMetrics({ cwd: root, source: candidate, sessionFile, since: window?.since, until: window?.until, inferIdleGap });
      if (!candidateSession) continue;
      candidates.push({ source: candidate, session: candidateSession });
    }
    if (!candidates.length && sessionFile) {
      for (const candidate of explicitSessionProbeSources(enabledSources, sessionFile).filter((candidate) => !enabledSources.includes(candidate))) {
        const candidateSession = await collectAgentSessionMetrics({ cwd: root, source: candidate, sessionFile, since: window?.since, until: window?.until, inferIdleGap });
        if (!candidateSession) continue;
        candidates.push({ source: candidate, session: candidateSession });
      }
    }
    if (candidates.length) {
      const merged = mergeAgentSessions(candidates, window);
      source = merged.source;
      session = merged.session;
      sessionFingerprintIdentity = merged.fingerprintIdentity;
    }
  }
  if (!options.source && !session) {
    const genericSession = await collectAgentSessionMetrics({ cwd: root, source: 'other', sessionFile, since: window?.since, until: window?.until, inferIdleGap: false });
    if (genericSession) {
      source = 'other';
      session = genericSession;
    }
  }
  const sessionFileRel = relativeDraftProjectPath(root, sessionFile);
  await assertExplicitSessionFileUsable({ sessionFile, sessionFileRel, sessionFound: Boolean(session) });
  warnings.push(...globalAgentSignalMismatchWarnings({
    autoSources,
    enabledSources,
    explicitSource: options.source,
    sessionFound: Boolean(session),
    sessionFileProvided: Boolean(sessionFile)
  }));
  const gitChangedFiles = excludeSessionFileChange({ changedFiles: git.changed_files, sessionFileRel });
  const changedFiles = mergeChangedFiles(gitChangedFiles, session?.changed_files ?? []);
  const linesAdded = sumChangedFileLines(changedFiles, 'lines_added');
  const linesRemoved = sumChangedFileLines(changedFiles, 'lines_removed');
  const filesChanged = changedFiles.length;
  const actualWindow = session?.collection_window ?? window;
  const actualWindowReason = session?.collection_window_reason ?? null;
  const mergedGit = { ...git, changed_files: changedFiles, files_changed: filesChanged, lines_added: linesAdded ?? 0, lines_removed: linesRemoved ?? 0 };
  const areas = changedAreas(changedFiles);
  const safeAreas = areas.length ? areas : ['Application code'];
  const configuredCommandIntent = options.runConfiguredCommands === true && options.skipConfiguredCommands !== true;
  const normalizedNote = normalizeUserNote(options.note);
  const fingerprint = collectionFingerprint({
    source,
    sessionId: session?.session_id,
    sessionIdentity: sessionFingerprintIdentity,
    headCommit: git.head_commit,
    window: actualWindow,
    changedFiles,
    userNote: redactedUserNoteForFingerprint(normalizedNote),
    configuredCommandIntent,
    collectionPolicy: collectionPolicyForFingerprint(config)
  });
  if (fingerprint && !options.force && !configuredCommandIntent) {
    const existing = await findDraftByFingerprint(root, fingerprint);
    warnings.push(...existing.warnings);
    if (existing.draft) return { draft: existing.draft, reusedExisting: true, warnings };
  }
  const configuredCommandStatus = configuredCommandIntent
    ? await collectConfiguredCommandMetricsWithStatus(root, config)
    : { metrics: null, warnings: [] };
  warnings.push(...configuredCommandStatus.warnings);
  const configuredCommandMetrics = configuredCommandStatus.metrics;
  const includeFileStats = config.collection.include_file_stats;
  const modelsUsed = sessionModelsUsed(session);
  const agentMetrics = configFilteredAgentMetrics(agentMetricsForSession(source, session), config);
  const metrics: WorklogMetrics = {
    tokens_used: config.collection.include_token_usage ? session?.tokens_used ?? null : null,
    estimated_cost_usd: config.collection.include_estimated_cost ? session?.estimated_cost_usd ?? null : null,
    duration_seconds: session?.duration_seconds ?? null,
    files_changed: includeFileStats ? filesChanged : null,
    lines_added: includeFileStats ? linesAdded : null,
    lines_removed: includeFileStats ? linesRemoved : null,
    tests_run: config.collection.include_test_results ? addOptionalCounts(session?.tests_run, configuredCommandMetrics?.tests_run) : null,
    tests_passed: config.collection.include_test_results ? addOptionalCounts(session?.tests_passed, configuredCommandMetrics?.tests_passed) : null,
    commits_created: null,
    failed_commands: addOptionalCounts(session?.failed_commands, configuredCommandMetrics?.failed_commands),
    commands_run: addOptionalCounts(session?.commands_run, configuredCommandMetrics?.commands_run),
    tool_calls: session?.tool_calls ?? null,
    skills_used: session?.skills_used ?? null,
    subagents_spawned: session?.subagents_spawned ?? null,
    subagents_completed: session?.subagents_completed ?? null,
    agent_turns: session?.agent_turns ?? null,
    models_used: modelsUsed.length ? modelsUsed : null,
    agent_metrics: agentMetrics,
    agent_modes: session?.agent_modes ?? null,
    collection_quality: session?.collection_quality ?? null,
    collection_sources: session?.collection_sources ?? null
  };
  const draft = buildCollectedDraft({
    root,
    config,
    git: mergedGit,
    source,
    sessionId: session?.session_id ?? null,
    sessionModel: session?.model ?? null,
    metrics,
    safeAreas,
    normalizedNote,
    actualWindow,
    actualWindowReason,
    fingerprint
  });
  await writeDraft(root, draft);
  return { draft, reusedExisting: false, warnings };
}

export async function collectDraft(options: CollectDraftOptions): Promise<LocalDraft> {
  return (await collectDraftWithStatus(options)).draft;
}
