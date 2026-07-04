import type { ChangedFileSummary } from '../types.js';
import { relativeProjectPath, upsertFile } from './agent-session-core.js';

export function antigravityFilePathFromUri(uri: string): string {
  if (!uri.startsWith('file://')) return uri;
  try {
    return decodeURIComponent(new URL(uri).pathname);
  } catch {
    return uri.replace(/^file:\/\//, '');
  }
}

function antigravityCodeActionStatus(content: string): ChangedFileSummary['status'] {
  if (/\bdeleted file\b/i.test(content)) return 'deleted';
  if (/\brenamed file\b/i.test(content)) return 'renamed';
  if (/\bcreated file\b/i.test(content)) return 'added';
  return 'modified';
}

export function antigravityCodeActionPaths(cwd: string, content: string): readonly string[] {
  const pattern = /\b(?:Created|Modified|Updated|Edited|Deleted|Renamed) file\s+(?<uri>file:\/\/[^\s]+|\/[^\s]+|[^\s]+)\b/gi;
  const paths: string[] = [];
  for (const match of content.matchAll(pattern)) {
    const rawPath = match.groups?.uri;
    if (!rawPath) continue;
    const rel = relativeProjectPath(cwd, antigravityFilePathFromUri(rawPath));
    if (rel) paths.push(rel);
  }
  return paths;
}

export function applyAntigravityCodeAction(cwd: string, content: string, files: Map<string, ChangedFileSummary>): void {
  const status = antigravityCodeActionStatus(content);
  for (const rel of antigravityCodeActionPaths(cwd, content)) {
    upsertFile(files, rel, { status, added: 0, removed: 0 });
  }
}
