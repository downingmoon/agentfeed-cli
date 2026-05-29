import { extname, join } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import type { ChangedFileSummary, GitMetrics } from '../types.js';
import { findGitRoot } from '../config/project-config.js';
import { run } from '../utils/shell.js';
import { shouldIgnoreEvidencePath } from './path-filter.js';

function statusFromCode(code: string): ChangedFileSummary['status'] {
  if (code.includes('A') || code === '??') return 'added';
  if (code.includes('D')) return 'deleted';
  if (code.includes('R')) return 'renamed';
  if (code.includes('M')) return 'modified';
  return 'unknown';
}

function shouldIgnorePath(path: string): boolean {
  return shouldIgnoreEvidencePath(path);
}

function languageFor(path: string): string | null {
  const ext = extname(path).toLowerCase();
  return ({ '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.md': 'Markdown', '.json': 'JSON' } as Record<string, string>)[ext] ?? null;
}

function countTextLines(text: string): number {
  if (!text) return 0;
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (!normalized) return 0;
  return normalized.split(/\r?\n/).length;
}

async function countUntrackedTextFileLines(root: string, path: string): Promise<number | null> {
  try {
    const info = await stat(join(root, path));
    if (!info.isFile() || info.size > 1_000_000) return null;
    const text = await readFile(join(root, path), 'utf8');
    if (text.includes('\u0000')) return null;
    return countTextLines(text);
  } catch {
    return null;
  }
}

function numstatPath(pathRaw?: string): string | null {
  if (!pathRaw) return null;
  if (pathRaw.includes(' => ')) return pathRaw.split(' => ').at(-1)!.replace(/[{}]/g, '');
  return pathRaw;
}

export async function collectGitMetrics(cwd: string): Promise<GitMetrics> {
  const root = await findGitRoot(cwd);
  if (!root) return { dirty: false, files_changed: 0, lines_added: 0, lines_removed: 0, changed_files: [] };

  const [status, numstat, cachedNumstat, branch, head, remote] = await Promise.all([
    run('git', ['status', '--porcelain', '-uall'], root),
    run('git', ['diff', '--numstat'], root),
    run('git', ['diff', '--cached', '--numstat'], root),
    run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], root),
    run('git', ['rev-parse', 'HEAD'], root),
    run('git', ['remote', 'get-url', 'origin'], root)
  ]);

  const files = new Map<string, ChangedFileSummary>();
  for (const line of (status.ok ? status.stdout : '').split('\n').filter(Boolean)) {
    const code = line.slice(0, 2).trim() || '??';
    const rawPath = line.slice(3).trim();
    const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1)! : rawPath;
    if (shouldIgnorePath(path)) continue;
    files.set(path, { path, extension: extname(path) || null, language: languageFor(path), status: statusFromCode(code), publish_path: false, lines_added: null, lines_removed: null });
  }

  let linesAdded = 0;
  let linesRemoved = 0;
  for (const output of [numstat, cachedNumstat]) {
    for (const line of (output.ok ? output.stdout : '').split('\n').filter(Boolean)) {
      const [addedRaw, removedRaw, pathRaw] = line.split('\t');
      const path = numstatPath(pathRaw);
      if (!path) continue;
      const added = Number(addedRaw);
      const removed = Number(removedRaw);
      const safeAdded = Number.isFinite(added) ? added : 0;
      const safeRemoved = Number.isFinite(removed) ? removed : 0;
      if (shouldIgnorePath(path)) continue;
      linesAdded += safeAdded;
      linesRemoved += safeRemoved;
      const current = files.get(path) ?? { path, extension: extname(path) || null, language: languageFor(path), status: 'modified' as const, publish_path: false };
      current.lines_added = (current.lines_added ?? 0) + safeAdded;
      current.lines_removed = (current.lines_removed ?? 0) + safeRemoved;
      files.set(path, current);
    }
  }

  for (const file of files.values()) {
    if (file.status !== 'added' || file.lines_added != null) continue;
    const lineCount = await countUntrackedTextFileLines(root, file.path);
    if (lineCount == null) continue;
    file.lines_added = lineCount;
    file.lines_removed = 0;
    linesAdded += lineCount;
  }

  return {
    repository_url: remote.ok ? remote.stdout.trim() || null : null,
    branch: branch.ok ? branch.stdout.trim() || null : null,
    head_commit: head.ok ? head.stdout.trim() || null : null,
    dirty: files.size > 0,
    files_changed: files.size,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    changed_files: [...files.values()]
  };
}
