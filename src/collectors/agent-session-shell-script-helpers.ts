import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';

export type ShellScriptEvidenceContext = {
  readonly projectRoot: string;
  readonly workdir: string | null;
};

export function shellWords(line: string): string[] {
  const words: string[] = [];
  const pattern = /'(?<single>[^']*)'|"(?<double>(?:\\"|[^"])*)"|(?<bare>\S+)/g;
  for (const match of line.matchAll(pattern)) {
    const word = match.groups?.single ?? match.groups?.double?.replace(/\\"/g, '"') ?? match.groups?.bare;
    if (word) words.push(word);
  }
  return words;
}

export function fileEvidence(context: ShellScriptEvidenceContext, rawPath: string, status: FileEvidence['status']): FileEvidence | null {
  const path = projectRelativeShellPath(context.projectRoot, context.workdir, rawPath);
  return path ? { path, status } : null;
}

export function modifiedEvidenceForPaths(context: ShellScriptEvidenceContext, paths: readonly string[]): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const rawPath of paths) {
    if (rawPath === '.') continue;
    const file = fileEvidence(context, rawPath, 'modified');
    if (file) files.push(file);
  }
  return files;
}
