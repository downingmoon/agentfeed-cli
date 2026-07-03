import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';

function shellWords(line: string): string[] {
  const words: string[] = [];
  const pattern = /'(?<single>[^']*)'|"(?<double>(?:\\"|[^"])*)"|(?<bare>\S+)/g;
  for (const match of line.matchAll(pattern)) {
    const word = match.groups?.single ?? match.groups?.double?.replace(/\\"/g, '"') ?? match.groups?.bare;
    if (word) words.push(word);
  }
  return words;
}

function evidence(projectRoot: string, workdir: string | null, rawPath: string, status: FileEvidence['status']): FileEvidence | null {
  const path = projectRelativeShellPath(projectRoot, workdir, rawPath);
  return path ? { path, status } : null;
}

function rmEvidence(projectRoot: string, workdir: string | null, words: readonly string[]): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const word of words.slice(1)) {
    if (word.startsWith('-')) {
      if (/[rR]/.test(word)) return [];
      continue;
    }
    const file = evidence(projectRoot, workdir, word, 'deleted');
    if (file) files.push(file);
  }
  return files;
}

function moveEvidence(projectRoot: string, workdir: string | null, words: readonly string[], offset: number): FileEvidence[] {
  const source = words[offset];
  const target = words[offset + 1];
  if (!source || !target || words.length !== offset + 2) return [];
  const deleted = evidence(projectRoot, workdir, source, 'deleted');
  const renamed = evidence(projectRoot, workdir, target, 'renamed');
  return [deleted, renamed].filter((file): file is FileEvidence => file !== null);
}

export function shellFileOperationEvidence(projectRoot: string, workdir: string | null, line: string): FileEvidence[] {
  const words = shellWords(line);
  const command = words[0];
  if (command === 'rm') return rmEvidence(projectRoot, workdir, words);
  if (command === 'mv') return moveEvidence(projectRoot, workdir, words, 1);
  if (command === 'git' && words[1] === 'mv') return moveEvidence(projectRoot, workdir, words, 2);
  if (command === 'git' && words[1] === 'rm') return rmEvidence(projectRoot, workdir, words.slice(1));
  return [];
}
