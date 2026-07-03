import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';

const APPLY_PATCH_FILE_HEADER = /^\*\*\* (?<kind>Add|Update|Delete) File: (?<path>.+)$/;

type ApplyPatchFile = {
  readonly path: string;
  readonly status: FileEvidence['status'];
  readonly added: number;
  readonly removed: number;
};

export function applyPatchDelimiter(line: string): string | null {
  if (!/(?:^|\s)apply_patch(?:\s|$)/.test(line)) return null;
  return /<<\s*['"]?(?<delimiter>[A-Za-z0-9_:-]+)['"]?/.exec(line)?.groups?.delimiter ?? null;
}

function applyPatchStatus(kind: string): FileEvidence['status'] {
  if (kind === 'Add') return 'added';
  if (kind === 'Delete') return 'deleted';
  return 'modified';
}

export function parseApplyPatchEvidence(projectRoot: string, workdir: string | null, content: readonly string[]): FileEvidence[] {
  const files: FileEvidence[] = [];
  let current: ApplyPatchFile | null = null;

  const flush = (): void => {
    if (!current) return;
    const path = projectRelativeShellPath(projectRoot, workdir, current.path);
    if (path) files.push({ path, status: current.status, added: current.added, removed: current.removed });
    current = null;
  };

  for (const line of content) {
    const header = APPLY_PATCH_FILE_HEADER.exec(line);
    const kind = header?.groups?.kind;
    const filePath = header?.groups?.path;
    if (kind && filePath) {
      flush();
      current = { path: filePath, status: applyPatchStatus(kind), added: 0, removed: 0 };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) current = { ...current, added: current.added + 1 };
    if (line.startsWith('-') && !line.startsWith('---')) current = { ...current, removed: current.removed + 1 };
  }
  flush();
  return files;
}
