import { join } from 'node:path';
import type { CollectionWindow } from '../types.js';
import { resolveProjectRoot } from './project-config.js';
import { flag, option } from '../cli/args.js';
import { pathExists, readJson, writeJson } from '../utils/fs.js';

export interface CollectionState {
  last_collected_at?: string | null;
}

function normalizeBoundary(value?: string | null): string | null {
  if (!value) return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`Invalid collection window timestamp: ${value}`);
  return new Date(millis).toISOString();
}

async function statePath(cwd: string): Promise<string> {
  const root = await resolveProjectRoot(cwd);
  return join(root, '.agentfeed', 'state.json');
}

export async function readCollectionState(cwd: string): Promise<CollectionState> {
  const path = await statePath(cwd);
  if (!(await pathExists(path))) return {};
  return readJson<CollectionState>(path);
}

export async function writeCollectionState(cwd: string, state: CollectionState): Promise<void> {
  const normalized = normalizeBoundary(state.last_collected_at);
  await writeJson(await statePath(cwd), { last_collected_at: normalized });
}

export async function resolveCollectionWindow(options: { cwd: string; args: string[]; now?: Date }): Promise<CollectionWindow> {
  const state = await readCollectionState(options.cwd);
  const sinceOption = option(options.args, '--since');
  const untilOption = option(options.args, '--until');
  const ignoreCursor = flag(options.args, '--all') || flag(options.args, '--force');
  const stateSince = ignoreCursor ? null : state.last_collected_at ?? null;
  const since = sinceOption === 'last-collect' ? state.last_collected_at ?? null : normalizeBoundary(sinceOption ?? stateSince);
  const until = normalizeBoundary(untilOption ?? (options.now ?? new Date()).toISOString());
  return { since, until };
}

export async function markCollectionComplete(cwd: string, window?: CollectionWindow | null, fallbackDate = new Date()): Promise<void> {
  await writeCollectionState(cwd, { last_collected_at: window?.until ?? fallbackDate.toISOString() });
}
