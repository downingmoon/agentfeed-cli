import { hostname } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import type { AgentType, CollectionWindow, LocalDraft, WorklogMetrics } from '../types.js';
import { loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { collectGitMetrics } from '../collectors/git.js';
import { collectAgentSessionMetrics } from '../collectors/agent-session.js';
import { collectConfiguredCommandMetricsWithStatus } from '../collectors/test-command.js';
import { changedAreas } from '../summary/changed-areas.js';
import { generateOutcome, generateSummary, generateTimeline } from '../summary/rule-based.js';
import { generateRicherSummaryFields } from '../summary/richer-summary.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { parseRequiredRedactedDraftFields } from './redacted-draft-fields.js';
import { randomSuffix, shortHash } from '../utils/hash.js';
import { AGENTFEED_TOOL_VERSION } from '../version.js';
import { writeDraft } from './write.js';
import { pathExists } from '../utils/fs.js';
import { collectionFingerprint, collectionPolicyForFingerprint, findDraftByFingerprint, redactedUserNoteForFingerprint } from './collection-fingerprint.js';
import { autoAgentSources, explicitSessionProbeSources } from './agent-source-detection.js';
import { globalAgentSignalMismatchWarnings } from './session-warnings.js';
import { addOptionalCounts, agentMetricsForSession, configFilteredAgentMetrics, mergeAgentSessions, mergeChangedFiles, sessionModelsUsed, sumChangedFileLines, type AgentSessionCandidate } from './session-aggregation.js';

function draftId(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `draft_${stamp}_${randomSuffix(4)}`;
}


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

function relativeProjectPath(cwd: string, filePath?: string | null): string | null {
  if (!filePath) return null;
  const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath);
  const rel = relative(resolve(cwd), absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split('\\').join('/');
}

function collectionWindow(options: { since?: string | null; until?: string | null }): CollectionWindow | null {
  const since = normalizeBoundary(options.since);
  const until = normalizeBoundary(options.until);
  if (!since && !until) return null;
  return { since, until };
}

export function createEmptyDraft(input: { projectName: string; projectRoot: string; source: AgentType }): LocalDraft {
  const areas = ['Application code'];
  const metrics: WorklogMetrics = { files_changed: 0, lines_added: 0, lines_removed: 0, tokens_used: null, estimated_cost_usd: null, tests_run: null, tests_passed: null, failed_commands: null };
  const title = 'Explored project with AI agent';
  const summary = generateSummary(areas, metrics);
  const publicFields = { title, summary, user_note: null, outcome: generateOutcome(areas), timeline: generateTimeline(), changed_areas: areas, tags: [], project: { name: input.projectName, repository_url: null } };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  const fields = parseRequiredRedactedDraftFields(redacted);
  return {
    schema_version: '0.2',
    id: draftId(),
    project: { name: fields.project.name, repository_url: null, local_path_hash: shortHash(input.projectRoot, 16) },
    worklog: { title: fields.title, summary: fields.summary, user_note: fields.user_note, agent: input.source, model: null, category: 'ai_tool', tags: fields.tags, visibility: 'private', metrics, changed_areas: fields.changed_areas, public_prompt: null, outcome: fields.outcome, timeline: fields.timeline },
    privacy_scan: scan,
    source: { agent: input.source, tool_version: AGENTFEED_TOOL_VERSION, host_label: hostname(), created_at: new Date().toISOString() },
    upload: { uploaded: false }
  };
}


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
  const inferIdleGap = options.inferIdleGap ?? (!options.force && !window?.since);
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
  const sessionFileRel = relativeProjectPath(root, sessionFile);
  if (sessionFile && !session) {
    const displayPath = sessionFileRel ?? sessionFile;
    const exists = await pathExists(sessionFile);
    throw new Error(exists
      ? `Agent session file did not produce usable metrics: ${displayPath}. The file may be unreadable, outside the collection window, unrelated to this project, or unsupported for the selected source. Retry with --source <source> and --all, or run agentfeed doctor.`
      : `Agent session file was not found: ${displayPath}. Check the path or rerun without --session-file to use auto-discovery.`);
  }
  warnings.push(...globalAgentSignalMismatchWarnings({
    autoSources,
    enabledSources,
    explicitSource: options.source,
    sessionFound: Boolean(session),
    sessionFileProvided: Boolean(sessionFile)
  }));
  const gitChangedFiles = sessionFileRel ? git.changed_files.filter((file) => file.path !== sessionFileRel) : git.changed_files;
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
  const generatedPublicFields = generateRicherSummaryFields({
    areas: safeAreas,
    metrics,
    git: mergedGit,
    tags: config.project.tags,
    publicPrompt: null,
  });
  const publicFields = {
    ...generatedPublicFields,
    user_note: normalizedNote,
    project: { name: config.project.name, repository_url: git.repository_url ?? config.project.repository_url ?? null }
  };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  const fields = parseRequiredRedactedDraftFields(redacted);
  const draft: LocalDraft = {
    schema_version: '0.2',
    id: draftId(),
    project: { name: fields.project.name, repository_url: fields.project.repository_url ?? null, local_path_hash: shortHash(root, 16) },
    worklog: {
      title: fields.title.slice(0, 120) || 'Explored project with AI agent',
      summary: fields.summary.slice(0, 2000) || 'The AI agent worked on the project.',
      user_note: fields.user_note?.slice(0, 500) ?? null,
      agent: source,
      model: session?.model ?? null,
      category: 'ai_tool',
      tags: fields.tags.slice(0, 10),
      visibility: 'private',
      metrics,
      changed_areas: fields.changed_areas.slice(0, 8),
      public_prompt: config.collection.include_public_prompt ? fields.public_prompt : null,
      outcome: fields.outcome.slice(0, 10),
      timeline: fields.timeline.slice(0, 8)
    },
    privacy_scan: scan,
    source: { agent: source, tool_version: AGENTFEED_TOOL_VERSION, host_label: hostname(), session_id: session?.session_id ?? null, created_at: new Date().toISOString(), collection_window: actualWindow, collection_window_reason: actualWindowReason, collection_fingerprint: fingerprint },
    upload: { uploaded: false }
  };
  await writeDraft(root, draft);
  return { draft, reusedExisting: false, warnings };
}

export async function collectDraft(options: CollectDraftOptions): Promise<LocalDraft> {
  return (await collectDraftWithStatus(options)).draft;
}
