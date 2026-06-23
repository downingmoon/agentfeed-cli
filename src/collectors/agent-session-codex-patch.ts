import type { ChangedFileSummary } from '../types.js';
import { relativeProjectPath, statusForPatchHeader, upsertFile } from './agent-session-core.js';

export function applyCodexPatchText(cwd: string, patch: string, files: Map<string, ChangedFileSummary>) {
  let currentPath: string | null = null;
  let currentStatus: ChangedFileSummary['status'] = 'modified';
  let added = 0;
  let removed = 0;

  function flush() {
    if (!currentPath) return;
    const rel = relativeProjectPath(cwd, currentPath);
    if (rel) upsertFile(files, rel, { status: currentStatus, added, removed });
    currentPath = null;
    currentStatus = 'modified';
    added = 0;
    removed = 0;
  }

  for (const line of patch.split('\n')) {
    const header = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (header) {
      flush();
      currentStatus = statusForPatchHeader(header[1]);
      currentPath = header[2].trim();
      continue;
    }
    if (!currentPath || line.startsWith('***') || line.startsWith('@@')) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) added += 1;
    else if (line.startsWith('-') && !line.startsWith('---')) removed += 1;
  }
  flush();
}
