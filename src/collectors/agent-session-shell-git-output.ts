import type { ChangedFileSummary } from '../types.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';

function statusFromPorcelain(code: string): ChangedFileSummary['status'] {
  if (code.includes('D')) return 'deleted';
  if (code.includes('R')) return 'renamed';
  if (code.includes('A') || code.includes('?')) return 'added';
  return 'modified';
}

export function parseGitStatusOutput(projectRoot: string, workdir: string | null, output: string): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^(?<code>[ MADRCU?!]{2})\s+(?<path>.+)$/.exec(line);
    const groups = match?.groups;
    if (!groups) continue;
    if (!/[MADRCU?!]/.test(groups.code)) continue;
    const rawPath = groups.path.includes(' -> ') ? groups.path.split(' -> ').at(-1) ?? groups.path : groups.path;
    const path = projectRelativeShellPath(projectRoot, workdir, rawPath);
    if (!path) continue;
    files.push({ path, status: statusFromPorcelain(groups.code) });
  }
  return files;
}

export function parseGitNumstatOutput(projectRoot: string, workdir: string | null, output: string): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^(?<added>\d+|-)\s+(?<removed>\d+|-)\s+(?<path>.+)$/.exec(line);
    const groups = match?.groups;
    if (!groups) continue;
    const path = projectRelativeShellPath(projectRoot, workdir, groups.path);
    if (!path) continue;
    files.push({
      path,
      status: 'modified',
      added: groups.added === '-' ? null : Number(groups.added),
      removed: groups.removed === '-' ? null : Number(groups.removed)
    });
  }
  return files;
}
