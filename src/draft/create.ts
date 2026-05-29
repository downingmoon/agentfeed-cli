import { hostname } from 'node:os';
import { join } from 'node:path';
import type { AgentType, ChangedFileSummary, CollectionWindow, LocalDraft, WorklogMetrics } from '../types.js';
import { loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { collectGitMetrics } from '../collectors/git.js';
import { collectAgentSessionMetrics } from '../collectors/agent-session.js';
import { changedAreas } from '../summary/changed-areas.js';
import { generateOutcome, generateSummary, generateTimeline, generateTitle } from '../summary/rule-based.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { randomSuffix, shortHash } from '../utils/hash.js';
import { writeDraft } from './write.js';
import { listDrafts, readDraft } from './read.js';

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

function applyUserNote(summary: string, note?: string | null): string {
  const trimmed = note?.trim();
  if (!trimmed) return summary;
  return `Note: ${trimmed.slice(0, 500)}\n\n${summary}`;
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
  const publicFields = { title, summary, outcome: generateOutcome(areas), timeline: generateTimeline(), changed_areas: areas, tags: [], project: { name: input.projectName, repository_url: null } };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  return {
    schema_version: '0.2',
    id: draftId(),
    project: { name: String((redacted.project as { name: string }).name), repository_url: null, local_path_hash: shortHash(input.projectRoot, 16) },
    worklog: { title: String(redacted.title), summary: String(redacted.summary), agent: input.source, model: null, category: 'ai_tool', tags: [], visibility: 'private', metrics, changed_areas: redacted.changed_areas as string[], public_prompt: null, outcome: redacted.outcome as string[], timeline: redacted.timeline as LocalDraft['worklog']['timeline'] },
    privacy_scan: scan,
    source: { agent: input.source, tool_version: 'agentfeed-cli/0.2.0', host_label: hostname(), created_at: new Date().toISOString() },
    upload: { uploaded: false }
  };
}


async function findDraftByFingerprint(cwd: string, fingerprint: string): Promise<LocalDraft | null> {
  for (const row of await listDrafts(cwd)) {
    const draft = await readDraft(cwd, row.id).catch(() => null);
    if (draft?.source.collection_fingerprint === fingerprint) return draft;
  }
  return null;
}

function normalizedChangedFilesForFingerprint(files: ChangedFileSummary[]): Array<Pick<ChangedFileSummary, 'path' | 'status' | 'lines_added' | 'lines_removed'>> {
  return files
    .filter((file) => file.path && file.path !== '.agentfeed' && !file.path.startsWith('.agentfeed/'))
    .map((file) => ({
      path: file.path,
      status: file.status,
      lines_added: file.lines_added ?? null,
      lines_removed: file.lines_removed ?? null
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function collectionFingerprint(input: { source: AgentType; sessionId?: string | null; headCommit?: string | null; window?: CollectionWindow | null; changedFiles?: ChangedFileSummary[] }): string | null {
  if (!input.headCommit) return null;
  if (input.sessionId) {
    return shortHash(JSON.stringify({ source: input.source, session_id: input.sessionId, head_commit: input.headCommit, window: input.window ?? null }), 16);
  }
  const changedFiles = normalizedChangedFilesForFingerprint(input.changedFiles ?? []);
  if (!changedFiles.length) return null;
  return shortHash(JSON.stringify({ source: input.source, head_commit: input.headCommit, window: input.window ?? null, changed_files: changedFiles }), 16);
}

export interface CollectDraftStatus {
  draft: LocalDraft;
  reusedExisting: boolean;
}

export async function collectDraftWithStatus(options: { cwd: string; source?: AgentType; sessionFile?: string | null; since?: string | null; until?: string | null; force?: boolean; note?: string | null }): Promise<CollectDraftStatus> {
  const root = await resolveProjectRoot(options.cwd);
  const config = await loadProjectConfig(root);
  let source = options.source ?? 'claude_code';
  const git = await collectGitMetrics(root);
  const window = collectionWindow(options);
  let session = await collectAgentSessionMetrics({ cwd: root, source, sessionFile: options.sessionFile, since: window?.since, until: window?.until });
  if (!options.source && !session) {
    const codexSession = await collectAgentSessionMetrics({ cwd: root, source: 'codex', sessionFile: options.sessionFile, since: window?.since, until: window?.until });
    if (codexSession) {
      source = 'codex';
      session = codexSession;
    }
  }
  if (!options.source && !session) {
    const geminiSession = await collectAgentSessionMetrics({ cwd: root, source: 'gemini_cli', sessionFile: options.sessionFile, since: window?.since, until: window?.until });
    if (geminiSession) {
      source = 'gemini_cli';
      session = geminiSession;
    }
  }
  if (!options.source && !session) {
    const genericSession = await collectAgentSessionMetrics({ cwd: root, source: 'other', sessionFile: options.sessionFile, since: window?.since, until: window?.until });
    if (genericSession) {
      source = 'other';
      session = genericSession;
    }
  }
  const changedFiles = git.changed_files.length ? git.changed_files : session?.changed_files ?? [];
  const linesAdded = git.lines_added || session?.lines_added || 0;
  const linesRemoved = git.lines_removed || session?.lines_removed || 0;
  const filesChanged = git.files_changed || session?.files_changed || changedFiles.length;
  const mergedGit = { ...git, changed_files: changedFiles, files_changed: filesChanged, lines_added: linesAdded, lines_removed: linesRemoved };
  const areas = changedAreas(changedFiles);
  const safeAreas = areas.length ? areas : ['Application code'];
  const metrics: WorklogMetrics = {
    tokens_used: config.collection.include_token_usage ? session?.tokens_used ?? null : null,
    estimated_cost_usd: null,
    duration_seconds: session?.duration_seconds ?? null,
    files_changed: filesChanged,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    tests_run: config.collection.include_test_results ? session?.tests_run ?? null : null,
    tests_passed: config.collection.include_test_results ? session?.tests_passed ?? null : null,
    commits_created: null,
    failed_commands: session?.failed_commands ?? null,
    commands_run: session?.commands_run ?? null,
    tool_calls: session?.tool_calls ?? null,
    skills_used: session?.skills_used ?? null,
    subagents_spawned: session?.subagents_spawned ?? null,
    subagents_completed: session?.subagents_completed ?? null,
    agent_turns: session?.agent_turns ?? null,
    agent_modes: session?.agent_modes ?? null,
    collection_quality: session?.collection_quality ?? null,
    collection_sources: session?.collection_sources ?? null
  };
  const fingerprint = collectionFingerprint({ source, sessionId: session?.session_id, headCommit: git.head_commit, window, changedFiles });
  if (fingerprint && !options.force) {
    const existing = await findDraftByFingerprint(root, fingerprint);
    if (existing) return { draft: existing, reusedExisting: true };
  }
  const title = generateTitle(safeAreas, mergedGit);
  const summary = applyUserNote(generateSummary(safeAreas, metrics), options.note);
  const publicFields = {
    title,
    summary,
    public_prompt: null,
    outcome: generateOutcome(safeAreas),
    timeline: generateTimeline(),
    changed_areas: safeAreas,
    tags: config.project.tags.slice(0, 10),
    project: { name: config.project.name, repository_url: git.repository_url ?? config.project.repository_url ?? null }
  };
  const { redacted, scan } = scanAndRedactFields(publicFields);
  const redProject = redacted.project as { name: string; repository_url?: string | null };
  const draft: LocalDraft = {
    schema_version: '0.2',
    id: draftId(),
    project: { name: redProject.name, repository_url: redProject.repository_url ?? null, local_path_hash: shortHash(root, 16) },
    worklog: {
      title: String(redacted.title).slice(0, 120) || 'Explored project with AI agent',
      summary: String(redacted.summary).slice(0, 2000) || 'The AI agent worked on the project.',
      agent: source,
      model: session?.model ?? null,
      category: 'ai_tool',
      tags: (redacted.tags as string[]).slice(0, 10),
      visibility: 'private',
      metrics,
      changed_areas: (redacted.changed_areas as string[]).slice(0, 8),
      public_prompt: config.collection.include_public_prompt ? (redacted.public_prompt as string | null) : null,
      outcome: (redacted.outcome as string[]).slice(0, 10),
      timeline: (redacted.timeline as LocalDraft['worklog']['timeline']).slice(0, 8)
    },
    privacy_scan: scan,
    source: { agent: source, tool_version: 'agentfeed-cli/0.2.0', host_label: hostname(), session_id: session?.session_id ?? null, created_at: new Date().toISOString(), collection_window: window, collection_fingerprint: fingerprint },
    upload: { uploaded: false }
  };
  await writeDraft(root, draft);
  return { draft, reusedExisting: false };
}

export async function collectDraft(options: { cwd: string; source?: AgentType; sessionFile?: string | null; since?: string | null; until?: string | null; force?: boolean; note?: string | null }): Promise<LocalDraft> {
  return (await collectDraftWithStatus(options)).draft;
}
