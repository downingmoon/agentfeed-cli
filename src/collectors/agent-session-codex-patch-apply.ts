import type { ChangedFileSummary } from '../types.js';
import { asRecord, asString, countTextLines, countUnifiedDiff, relativeProjectPath, upsertFile } from './agent-session-core.js';

export function applyCodexPatchApplyEnd(cwd: string, changes: Record<string, unknown> | null, files: Map<string, ChangedFileSummary>): void {
  if (!changes) return;
  for (const [absolutePath, changeRaw] of Object.entries(changes)) {
    const rel = relativeProjectPath(cwd, absolutePath);
    if (!rel) continue;
    const change = asRecord(changeRaw) ?? {};
    const kind = asString(change.type);
    let added = 0;
    let removed = 0;
    const diff = asString(change.unified_diff);
    if (diff) {
      const counts = countUnifiedDiff(diff);
      added = counts.added;
      removed = counts.removed;
    } else {
      added = countTextLines(asString(change.content) ?? '');
    }
    upsertFile(files, rel, { status: kind === 'add' ? 'added' : kind === 'delete' ? 'deleted' : 'modified', added, removed });
  }
}
