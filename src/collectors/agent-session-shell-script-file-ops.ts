import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { fileEvidence, modifiedEvidenceForPaths, shellWords, type ShellScriptEvidenceContext } from './agent-session-shell-script-helpers.js';

function rmEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const word of words.slice(1)) {
    if (word.startsWith('-')) {
      if (/[rR]/.test(word)) return [];
      continue;
    }
    const file = fileEvidence(context, word, 'deleted');
    if (file) files.push(file);
  }
  return files;
}

function moveEvidence(context: ShellScriptEvidenceContext, words: readonly string[], offset: number): FileEvidence[] {
  const source = words[offset];
  const target = words[offset + 1];
  if (!source || !target || words.length !== offset + 2) return [];
  const deleted = fileEvidence(context, source, 'deleted');
  const renamed = fileEvidence(context, target, 'renamed');
  return [deleted, renamed].filter((file): file is FileEvidence => file !== null);
}

function copyEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
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
  const copied = fileEvidence(context, paths[1], 'modified');
  return copied ? [copied] : [];
}

function installEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
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
  const installed = fileEvidence(context, paths[1], 'modified');
  return installed ? [installed] : [];
}

function linkEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
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
    if (!optionsEnded && (word === '-t' || word.startsWith('--target-directory'))) return [];
    if (!optionsEnded && (word === '-S' || word === '--suffix')) {
      skipNext = true;
      continue;
    }
    if (!optionsEnded && word.startsWith('-')) continue;
    paths.push(word);
  }
  if (paths.length !== 2) return [];
  const linked = fileEvidence(context, paths[1], 'modified');
  return linked ? [linked] : [];
}

function gitRestoreEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
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
  return modifiedEvidenceForPaths(context, paths);
}

function gitCheckoutEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
  const delimiter = words.indexOf('--');
  if (delimiter < 0) return [];
  return modifiedEvidenceForPaths(context, words.slice(delimiter + 1));
}

function touchEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
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
  return modifiedEvidenceForPaths(context, paths);
}

function metadataEvidence(context: ShellScriptEvidenceContext, words: readonly string[]): FileEvidence[] {
  const paths: string[] = [];
  let subjectSeen = false;
  let skipNext = false;
  for (const word of words.slice(1)) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (!subjectSeen && (word === '-R' || word === '--recursive')) return [];
    if (!subjectSeen && (word === '--reference' || word === '--from')) {
      skipNext = true;
      subjectSeen = true;
      continue;
    }
    if (!subjectSeen && (word.startsWith('--reference=') || word.startsWith('--from='))) {
      subjectSeen = true;
      continue;
    }
    if (!subjectSeen && /^-[cfhv]+$/.test(word)) continue;
    if (!subjectSeen) {
      subjectSeen = true;
      continue;
    }
    paths.push(word);
  }
  return modifiedEvidenceForPaths(context, paths);
}

export function shellFileOperationEvidence(projectRoot: string, workdir: string | null, line: string): FileEvidence[] {
  const words = shellWords(line);
  const command = words[0];
  const context = { projectRoot, workdir };
  if (command === 'rm') return rmEvidence(context, words);
  if (command === 'touch') return touchEvidence(context, words);
  if (command === 'cp') return copyEvidence(context, words);
  if (command === 'install') return installEvidence(context, words);
  if (command === 'ln') return linkEvidence(context, words);
  if (command === 'chmod' || command === 'chown' || command === 'chgrp') return metadataEvidence(context, words);
  if (command === 'mv') return moveEvidence(context, words, 1);
  if (command === 'git' && words[1] === 'mv') return moveEvidence(context, words, 2);
  if (command === 'git' && words[1] === 'rm') return rmEvidence(context, words.slice(1));
  if (command === 'git' && words[1] === 'restore') return gitRestoreEvidence(context, words);
  if (command === 'git' && words[1] === 'checkout') return gitCheckoutEvidence(context, words);
  return [];
}
