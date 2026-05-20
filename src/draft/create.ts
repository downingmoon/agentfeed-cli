import { hostname } from 'node:os';
import { join } from 'node:path';
import type { AgentType, LocalDraft, WorklogMetrics } from '../types.js';
import { loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { collectGitMetrics } from '../collectors/git.js';
import { collectAgentSessionMetrics } from '../collectors/agent-session.js';
import { changedAreas } from '../summary/changed-areas.js';
import { generateOutcome, generateSummary, generateTimeline, generateTitle } from '../summary/rule-based.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { randomSuffix, shortHash } from '../utils/hash.js';
import { writeDraft } from './write.js';

function draftId(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `draft_${stamp}_${randomSuffix(4)}`;
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

export async function collectDraft(options: { cwd: string; source?: AgentType; sessionFile?: string | null }): Promise<LocalDraft> {
  const root = await resolveProjectRoot(options.cwd);
  const config = await loadProjectConfig(root);
  let source = options.source ?? 'claude_code';
  const git = await collectGitMetrics(root);
  let session = await collectAgentSessionMetrics({ cwd: root, source, sessionFile: options.sessionFile });
  if (!options.source && !session) {
    const codexSession = await collectAgentSessionMetrics({ cwd: root, source: 'codex', sessionFile: options.sessionFile });
    if (codexSession) {
      source = 'codex';
      session = codexSession;
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
    duration_seconds: null,
    files_changed: filesChanged,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    tests_run: config.collection.include_test_results ? session?.tests_run ?? null : null,
    tests_passed: config.collection.include_test_results ? session?.tests_passed ?? null : null,
    commits_created: null,
    failed_commands: session?.failed_commands ?? null
  };
  const title = generateTitle(safeAreas, mergedGit);
  const summary = generateSummary(safeAreas, metrics);
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
    source: { agent: source, tool_version: 'agentfeed-cli/0.2.0', host_label: hostname(), session_id: session?.session_id ?? null, created_at: new Date().toISOString() },
    upload: { uploaded: false }
  };
  await writeDraft(root, draft);
  return draft;
}
