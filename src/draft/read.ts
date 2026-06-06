import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { LocalDraft } from '../types.js';
import { resolveProjectRoot } from '../config/project-config.js';
import { pathExists, readJson } from '../utils/fs.js';
import { validateLocalDraft } from './validation.js';
import { draftPaths, isSafeDraftId } from './paths.js';

function draftNotFoundMessage(id: string): string {
  return [
    `Draft not found: ${id}`,
    '',
    'Inspect saved drafts:',
    'Run: agentfeed drafts',
    '',
    'Create a fresh draft:',
    'Run: agentfeed collect --explain'
  ].join('\n');
}

function noDraftsMessage(): string {
  return [
    'No local drafts found.',
    '',
    'Create a draft:',
    'Run: agentfeed collect --explain',
    'Run: agentfeed share --dry',
    '',
    'Inspect saved drafts:',
    'Run: agentfeed drafts'
  ].join('\n');
}

export async function readDraft(cwd: string, id: string): Promise<LocalDraft> {
  const root = await resolveProjectRoot(cwd);
  const { jsonPath } = draftPaths(root, id);
  if (!(await pathExists(jsonPath))) throw new Error(draftNotFoundMessage(id));
  const draft = validateLocalDraft(await readJson<unknown>(jsonPath), jsonPath);
  if (draft.id !== id) {
    throw new Error(`AgentFeed draft is invalid at ${jsonPath}: id must match requested draft id ${id}. Run agentfeed collect to create a fresh draft.`);
  }
  return draft;
}

export async function listDrafts(cwd: string): Promise<Array<{ id: string; path: string; mtimeMs: number }>> {
  const root = await resolveProjectRoot(cwd);
  const draftsDir = join(root, '.agentfeed', 'drafts');
  if (!(await pathExists(draftsDir))) return [];
  const files = (await readdir(draftsDir)).filter((file) => file.endsWith('.json') && isSafeDraftId(file.replace(/\.json$/, '')));
  const rows = await Promise.all(files.map(async (file) => {
    const path = join(draftsDir, file);
    return { id: file.replace(/\.json$/, ''), path, mtimeMs: (await stat(path)).mtimeMs };
  }));
  return rows.sort((a, b) => b.mtimeMs - a.mtimeMs || b.id.localeCompare(a.id));
}

export async function findLatestDraft(cwd: string): Promise<{ id: string; path: string; mtimeMs: number } | null> {
  return (await listDrafts(cwd))[0] ?? null;
}

export async function readLatestDraft(cwd: string): Promise<LocalDraft> {
  const latest = await findLatestDraft(cwd);
  if (!latest) throw new Error(noDraftsMessage());
  return readDraft(cwd, latest.id);
}
