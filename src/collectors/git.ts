import { extname } from 'node:path';
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

export async function collectGitMetrics(cwd: string): Promise<GitMetrics> {
  const root = await findGitRoot(cwd);
  if (!root) return { dirty: false, files_changed: 0, lines_added: 0, lines_removed: 0, changed_files: [] };

  const [status, numstat, branch, head, remote] = await Promise.all([
    run('git', ['status', '--porcelain'], root),
    run('git', ['diff', '--numstat'], root),
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
  for (const line of (numstat.ok ? numstat.stdout : '').split('\n').filter(Boolean)) {
    const [addedRaw, removedRaw, pathRaw] = line.split('\t');
    const path = pathRaw?.includes(' => ') ? pathRaw.split(' => ').at(-1)!.replace(/[{}]/g, '') : pathRaw;
    if (!path) continue;
    const added = Number(addedRaw);
    const removed = Number(removedRaw);
    const safeAdded = Number.isFinite(added) ? added : 0;
    const safeRemoved = Number.isFinite(removed) ? removed : 0;
    if (shouldIgnorePath(path)) continue;
    linesAdded += safeAdded;
    linesRemoved += safeRemoved;
    const current = files.get(path) ?? { path, extension: extname(path) || null, language: languageFor(path), status: 'modified' as const, publish_path: false };
    current.lines_added = safeAdded;
    current.lines_removed = safeRemoved;
    files.set(path, current);
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
