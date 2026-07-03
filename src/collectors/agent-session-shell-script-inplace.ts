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

function changedFile(projectRoot: string, workdir: string | null, rawPath: string): FileEvidence | null {
  const path = projectRelativeShellPath(projectRoot, workdir, rawPath);
  return path ? { path, status: 'modified' } : null;
}

function sedTargetWords(words: readonly string[]): readonly string[] {
  const editIndex = words.findIndex((word) => word === '-i' || /^-i[^-\s]+/.test(word));
  if (editIndex < 0) return [];
  const targets: string[] = [];
  let scriptConsumed = false;
  for (let index = editIndex + 1; index < words.length; index += 1) {
    const word = words[index];
    if (!word) continue;
    if (word === '-e' || word === '-f') {
      index += 1;
      scriptConsumed = true;
      continue;
    }
    if (word.startsWith('-')) continue;
    if (!scriptConsumed) {
      scriptConsumed = true;
      continue;
    }
    targets.push(word);
  }
  return targets;
}

function perlTargetWords(words: readonly string[]): readonly string[] {
  const editIndex = words.findIndex((word) => word.startsWith('-') && word.includes('p') && word.includes('i'));
  if (editIndex < 0) return [];
  const targets: string[] = [];
  for (let index = editIndex + 1; index < words.length; index += 1) {
    const word = words[index];
    if (!word) continue;
    if (word === '-e' || word === '-E') {
      index += 1;
      continue;
    }
    if (word.startsWith('-')) continue;
    targets.push(word);
  }
  return targets;
}

export function shellInPlaceEditEvidence(projectRoot: string, workdir: string | null, line: string): FileEvidence[] {
  const words = shellWords(line);
  const command = words[0];
  const targets = command === 'sed'
    ? sedTargetWords(words)
    : command === 'perl'
      ? perlTargetWords(words)
      : [];
  return targets
    .map((target) => changedFile(projectRoot, workdir, target))
    .filter((evidence): evidence is FileEvidence => evidence !== null);
}
