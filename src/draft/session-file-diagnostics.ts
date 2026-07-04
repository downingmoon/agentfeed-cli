import { isAbsolute, relative, resolve } from 'node:path';
import type { ChangedFileSummary } from '../types.js';
import { pathExists } from '../utils/fs.js';

export function relativeDraftProjectPath(cwd: string, filePath?: string | null): string | null {
  if (!filePath) return null;
  const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath);
  const rel = relative(resolve(cwd), absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split('\\').join('/');
}

export async function assertExplicitSessionFileUsable(input: {
  readonly sessionFile: string | null;
  readonly sessionFileRel: string | null;
  readonly sessionFound: boolean;
}): Promise<void> {
  if (!input.sessionFile || input.sessionFound) return;
  const displayPath = input.sessionFileRel ?? input.sessionFile;
  const exists = await pathExists(input.sessionFile);
  throw new Error(exists
    ? `Agent session file did not produce usable metrics: ${displayPath}. The file may be unreadable, outside the collection window, unrelated to this project, or unsupported for the selected source. Retry with --source <source> and --all, or run agentfeed doctor.`
    : `Agent session file was not found: ${displayPath}. Check the path or rerun without --session-file to use auto-discovery.`);
}

export function excludeSessionFileChange(input: {
  readonly changedFiles: readonly ChangedFileSummary[];
  readonly sessionFileRel: string | null;
}): ChangedFileSummary[] {
  return input.sessionFileRel ? input.changedFiles.filter((file) => file.path !== input.sessionFileRel) : [...input.changedFiles];
}
