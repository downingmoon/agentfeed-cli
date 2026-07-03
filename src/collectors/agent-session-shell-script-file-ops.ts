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

function copyEvidence(projectRoot: string, workdir: string | null, words: readonly string[]): FileEvidence[] {
  const paths: string[] = [];
  let optionsEnded = false;
  for (const word of words.slice(1)) {
    if (!optionsEnded && word === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && word.startsWith('-')) {
      const isShortRecursive = /^-[^-]/.test(word) && /[aRr]/.test(word);
      if (isShortRecursive || word === '--archive' || word === '--recursive' || word.startsWith('--target-directory') || word === '-t') return [];
      continue;
    }
    paths.push(word);
  }
  if (paths.length !== 2) return [];
  const copied = evidence(projectRoot, workdir, paths[1], 'modified');
  return copied ? [copied] : [];
}

function installEvidence(projectRoot: string, workdir: string | null, words: readonly string[]): FileEvidence[] {
  const paths: string[] = [];
  let optionsEnded = false;
  let skipNext = false;
  for (const word of words.slice(1)) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (!optionsEnded && word === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && (word === '-d' || word === '--directory' || word === '-t' || word.startsWith('--target-directory'))) return [];
    if (!optionsEnded && (/^-[mogS]$/.test(word) || word === '--mode' || word === '--owner' || word === '--group' || word === '--suffix')) {
      skipNext = true;
      continue;
    }
    if (!optionsEnded && word.startsWith('-')) continue;
    paths.push(word);
  }
  if (paths.length !== 2) return [];
  const installed = evidence(projectRoot, workdir, paths[1], 'modified');
  return installed ? [installed] : [];
}

function modifiedEvidenceForPaths(projectRoot: string, workdir: string | null, paths: readonly string[]): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const rawPath of paths) {
    if (rawPath === '.') continue;
    const file = evidence(projectRoot, workdir, rawPath, 'modified');
    if (file) files.push(file);
  }
  return files;
}

function gitRestoreEvidence(projectRoot: string, workdir: string | null, words: readonly string[]): FileEvidence[] {
  const paths: string[] = [];
  let optionsEnded = false;
  let skipNext = false;
  for (const word of words.slice(2)) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (!optionsEnded && word === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && (word === '--pathspec-from-file' || word.startsWith('--pathspec-from-file='))) return [];
    if (!optionsEnded && (word === '-p' || word === '--patch')) return [];
    if (!optionsEnded && (word === '-s' || word === '--source')) {
      skipNext = true;
      continue;
    }
    if (!optionsEnded && (word.startsWith('--source=') || word.startsWith('-'))) continue;
    paths.push(word);
  }
  return modifiedEvidenceForPaths(projectRoot, workdir, paths);
}

function gitCheckoutEvidence(projectRoot: string, workdir: string | null, words: readonly string[]): FileEvidence[] {
  const delimiter = words.indexOf('--');
  if (delimiter < 0) return [];
  return modifiedEvidenceForPaths(projectRoot, workdir, words.slice(delimiter + 1));
}

function touchEvidence(projectRoot: string, workdir: string | null, words: readonly string[]): FileEvidence[] {
  const paths: string[] = [];
  let optionsEnded = false;
  let skipNext = false;
  for (const word of words.slice(1)) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (!optionsEnded && word === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && (word === '-r' || word === '--reference' || word === '-d' || word === '--date' || word === '-t')) {
      skipNext = true;
      continue;
    }
    if (!optionsEnded && (word.startsWith('--reference=') || word.startsWith('--date=') || word.startsWith('-'))) continue;
    paths.push(word);
  }
  return modifiedEvidenceForPaths(projectRoot, workdir, paths);
}

export function shellFileOperationEvidence(projectRoot: string, workdir: string | null, line: string): FileEvidence[] {
  const words = shellWords(line);
  const command = words[0];
  if (command === 'rm') return rmEvidence(projectRoot, workdir, words);
  if (command === 'touch') return touchEvidence(projectRoot, workdir, words);
  if (command === 'cp') return copyEvidence(projectRoot, workdir, words);
  if (command === 'install') return installEvidence(projectRoot, workdir, words);
  if (command === 'mv') return moveEvidence(projectRoot, workdir, words, 1);
  if (command === 'git' && words[1] === 'mv') return moveEvidence(projectRoot, workdir, words, 2);
  if (command === 'git' && words[1] === 'rm') return rmEvidence(projectRoot, workdir, words.slice(1));
  if (command === 'git' && words[1] === 'restore') return gitRestoreEvidence(projectRoot, workdir, words);
  if (command === 'git' && words[1] === 'checkout') return gitCheckoutEvidence(projectRoot, workdir, words);
  return [];
}
