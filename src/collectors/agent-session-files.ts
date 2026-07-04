import { homedir } from 'node:os';
import { realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import type { AgentType } from '../types.js';
import { asRecord, asString, safeJsonParse } from './agent-session-core.js';
import { antigravityHistoryTranscriptCandidates, type SessionFileCandidate } from './agent-session-antigravity-history.js';

const DEFAULT_SESSION_FILE_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_SESSION_JSONL_MAX_ROWS = 50_000;
const DEFAULT_SESSION_JSONL_MAX_LINE_CHARS = 1_000_000;

function boundedPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function sessionFileMaxBytes(): number {
  return boundedPositiveIntegerEnv('AGENTFEED_SESSION_FILE_MAX_BYTES', DEFAULT_SESSION_FILE_MAX_BYTES);
}

function sessionJsonlMaxRows(): number {
  return boundedPositiveIntegerEnv('AGENTFEED_SESSION_JSONL_MAX_ROWS', DEFAULT_SESSION_JSONL_MAX_ROWS);
}

function sessionJsonlMaxLineChars(): number {
  return boundedPositiveIntegerEnv('AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS', DEFAULT_SESSION_JSONL_MAX_LINE_CHARS);
}

function parseJsonlRecords(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const maxRows = sessionJsonlMaxRows();
  const maxLineChars = sessionJsonlMaxLineChars();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (line.length > maxLineChars) continue;
    const row = asRecord(safeJsonParse(line));
    if (row) {
      rows.push(row);
      if (rows.length > maxRows) rows.shift();
    }
  }
  return rows;
}

async function readBoundedSessionText(sessionFile: string): Promise<string | null> {
  try {
    const info = await stat(sessionFile);
    if (!info.isFile()) return null;
    const maxBytes = sessionFileMaxBytes();
    if (info.size > maxBytes) {
      const handle = await open(sessionFile, 'r');
      try {
        const start = Math.max(0, info.size - maxBytes);
        const buffer = Buffer.alloc(Math.min(maxBytes, info.size));
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
        let text = buffer.subarray(0, bytesRead).toString('utf8');
        if (start > 0) {
          const firstNewline = text.indexOf('\n');
          text = firstNewline >= 0 ? text.slice(firstNewline + 1) : '';
        }
        return text;
      } finally {
        await handle.close();
      }
    }
    return await readFile(sessionFile, 'utf8');
  } catch {
    return null;
  }
}

export async function readSessionJsonlRecords(sessionFile: string): Promise<Record<string, unknown>[] | null> {
  const text = await readBoundedSessionText(sessionFile);
  if (text == null) return null;
  return parseJsonlRecords(text);
}

function jsonLineMentionsProject(line: string, projectRoot: string): boolean {
  return line.includes(projectRoot) || line.includes(`file://${projectRoot}`);
}

async function sessionFileMentionsProjectPath(sessionFile: string, cwd: string): Promise<boolean> {
  const projectRoot = canonicalPath(cwd);
  const text = await readBoundedSessionText(sessionFile);
  if (text == null) return false;
  return text.split('\n').some((line) => jsonLineMentionsProject(line, projectRoot));
}

function findStructuredCwd(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const cwd = asString(record.cwd);
  if (cwd) return cwd;
  const payload = asRecord(record.payload);
  if (payload) {
    const payloadCwd = asString(payload.cwd);
    if (payloadCwd) return payloadCwd;
  }
  return null;
}

function canonicalPath(path: string): string {
  const absolute = resolve(path);
  const suffix: string[] = [];
  let current = absolute;
  while (true) {
    try {
      const real = realpathSync.native(current);
      return suffix.length ? join(real, ...suffix.reverse()) : real;
    } catch {
      const parent = dirname(current);
      if (parent === current) return absolute;
      suffix.push(basename(current));
      current = parent;
    }
  }
}

async function structuredCwdMatchState(sessionFile: string, cwd: string): Promise<{ readonly sawStructuredCwd: boolean; readonly matchedProject: boolean }> {
  const projectRoot = canonicalPath(cwd);
  let sawStructuredCwd = false;
  const text = await readBoundedSessionText(sessionFile);
  if (text == null) return { sawStructuredCwd: true, matchedProject: false };
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const structuredCwd = findStructuredCwd(safeJsonParse(line));
    if (!structuredCwd) continue;
    sawStructuredCwd = true;
    const absoluteCwd = canonicalPath(structuredCwd);
    if (absoluteCwd === projectRoot || absoluteCwd.startsWith(`${projectRoot}/`)) return { sawStructuredCwd, matchedProject: true };
  }
  return { sawStructuredCwd, matchedProject: false };
}

export async function sessionFileBelongsToProject(sessionFile: string, cwd: string): Promise<boolean> {
  return (await structuredCwdMatchState(sessionFile, cwd)).matchedProject;
}

export async function sessionFileMayBelongToProject(sessionFile: string, cwd: string): Promise<boolean> {
  const state = await structuredCwdMatchState(sessionFile, cwd);
  return !state.sawStructuredCwd || state.matchedProject;
}

async function sessionFileCanBeAutoDiscovered(sessionFile: string, cwd: string, options: { readonly allowProjectScopedNoCwd?: boolean; readonly allowContentPathMatch?: boolean } = {}): Promise<boolean> {
  const state = await structuredCwdMatchState(sessionFile, cwd);
  if (state.matchedProject) return true;
  if (options.allowContentPathMatch && !state.sawStructuredCwd && await sessionFileMentionsProjectPath(sessionFile, cwd)) return true;
  return Boolean(options.allowProjectScopedNoCwd && !state.sawStructuredCwd);
}

function claudeProjectDirName(cwd: string): string {
  return resolve(cwd).replace(/\//g, '-');
}

async function existingFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isFile() === true;
}

async function newestJsonlUnder(dir: string, limit = 80): Promise<string[]> {
  async function walk(current: string, depth: number): Promise<Array<{ readonly path: string; readonly mtime: number }>> {
    if (depth < 0) return [];
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return []; }
    const rows: Array<{ readonly path: string; readonly mtime: number }> = [];
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) rows.push(...await walk(path, depth - 1));
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          rows.push({ path, mtime: (await stat(path)).mtimeMs });
        } catch {
          continue;
        }
      }
    }
    return rows;
  }
  return (await walk(dir, 5)).sort((a, b) => b.mtime - a.mtime).slice(0, limit).map((row) => row.path);
}

export async function discoverSessionFile(cwd: string, source: AgentType): Promise<string | null> {
  const home = homedir();
  const candidates: SessionFileCandidate[] = [];
  if (source === 'claude_code') {
    candidates.push(...(await newestJsonlUnder(join(home, '.claude', 'projects', claudeProjectDirName(cwd)), 20)).map((path) => ({ path, allowProjectScopedNoCwd: true })));
    candidates.push(...(await newestJsonlUnder(join(home, '.claude', 'projects'), 80)).map((path) => ({ path })));
  } else if (source === 'codex') {
    candidates.push(...(await newestJsonlUnder(join(home, '.codex', 'sessions'), 120)).map((path) => ({ path })));
  } else if (source === 'gemini_cli') {
    candidates.push(...await antigravityHistoryTranscriptCandidates(home, cwd));
    for (const tmpProject of await readdir(join(home, '.gemini', 'tmp'), { withFileTypes: true }).catch(() => [])) {
      if (tmpProject.isDirectory()) candidates.push(...(await newestJsonlUnder(join(home, '.gemini', 'tmp', tmpProject.name, 'chats'), 20)).map((path) => ({ path })));
    }
    for (const path of await newestJsonlUnder(join(home, '.gemini', 'antigravity-cli', 'brain'), 160)) {
      if (path.endsWith('/.system_generated/logs/transcript.jsonl')) candidates.push({ path });
    }
  } else {
    return null;
  }
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.path)) continue;
    seen.add(candidate.path);
    if (source === 'gemini_cli') {
      if (candidate.trustedProjectMatch && await existingFile(candidate.path)) return candidate.path;
      const projectRoot = await readFile(join(dirname(dirname(candidate.path)), '.project_root'), 'utf8').catch(() => '');
      if (projectRoot && resolve(projectRoot.trim()) === resolve(cwd)) return candidate.path;
      if (await sessionFileCanBeAutoDiscovered(candidate.path, cwd, { allowProjectScopedNoCwd: candidate.allowProjectScopedNoCwd, allowContentPathMatch: true }).catch(() => false)) return candidate.path;
      continue;
    }
    if (await sessionFileCanBeAutoDiscovered(candidate.path, cwd, { allowProjectScopedNoCwd: candidate.allowProjectScopedNoCwd }).catch(() => false)) return candidate.path;
  }
  return null;
}
