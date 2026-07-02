import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';

const SHELL_REDIRECT_TARGET = /(?:^|\s)(?:\d?>|>>|>)\s*(['"]?)([^'"\s;&|<>]+)\1/g;
const SHELL_TEE_TARGET = /(?:^|\s)tee\s+(?:-[a-zA-Z]+\s+)*(['"]?)([^'"\s;&|<>]+)\1/g;
const PYTHON_TRIPLE_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*('''|""")(?<content>[\s\S]*?)\3/g;
const PYTHON_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*(['"])(?<content>[\s\S]*?)\3/g;
const PYTHON_PATH_BINDING_TARGET = /\b(?<name>[A-Za-z_]\w*)\s*=\s*Path\(\s*(['"])(?<path>[^'"]+)\2\s*\)/g;
const PYTHON_OPEN_BINDING_TARGET = /\bwith\s+open\(\s*(['"])(?<path>[^'"]+)\1\s*,\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)\s+as\s+(?<name>[A-Za-z_]\w*)\s*:/g;
const NODE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?writeFileSync\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<content>[\s\S]*?)\3/g;

type ScriptWriteEvidenceInput = {
  readonly projectRoot: string;
  readonly workdir: string | null;
  readonly pattern: RegExp;
  readonly command: string;
};

type BoundScriptTarget = {
  readonly name: string;
  readonly path: string;
};

type BoundScriptWriteEvidenceInput = {
  readonly projectRoot: string;
  readonly workdir: string | null;
  readonly command: string;
  readonly targets: readonly BoundScriptTarget[];
};

function heredocTarget(line: string): { readonly path: string; readonly delimiter: string } | null {
  const delimiterMatch = /<<\s*['"]?(?<delimiter>[A-Za-z0-9_:-]+)['"]?/.exec(line);
  const delimiter = delimiterMatch?.groups?.delimiter;
  if (!delimiter) return null;
  SHELL_REDIRECT_TARGET.lastIndex = 0;
  const redirect = [...line.matchAll(SHELL_REDIRECT_TARGET)].at(-1)?.[2];
  if (redirect) return { path: redirect, delimiter };
  SHELL_TEE_TARGET.lastIndex = 0;
  const tee = [...line.matchAll(SHELL_TEE_TARGET)].at(-1)?.[2];
  return tee ? { path: tee, delimiter } : null;
}

function unescapeScriptText(value: string): string {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scriptWriteEvidence(input: ScriptWriteEvidenceInput): FileEvidence[] {
  const files: FileEvidence[] = [];
  input.pattern.lastIndex = 0;
  for (const match of input.command.matchAll(input.pattern)) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, match.groups?.path ?? '');
    if (!path) continue;
    files.push({
      path,
      status: 'modified',
      added: countTextLines(unescapeScriptText(match.groups?.content ?? ''))
    });
  }
  return files;
}

function pythonBoundTargets(command: string): BoundScriptTarget[] {
  const targets: BoundScriptTarget[] = [];
  PYTHON_PATH_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_PATH_BINDING_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) targets.push({ name, path });
  }

  PYTHON_OPEN_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_OPEN_BINDING_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    const mode = match.groups?.mode ?? '';
    if (name && path && /[wax+]/.test(mode)) targets.push({ name, path });
  }
  return targets;
}

function boundScriptWriteEvidence(input: BoundScriptWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const target of input.targets) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, target.path);
    if (!path) continue;
    const triplePattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text)?\\(\\s*('''|""")(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(triplePattern)) {
      const added = countTextLines(unescapeScriptText(match.groups?.content ?? ''));
      const current = files.get(path);
      files.set(path, {
        path,
        status: 'modified',
        added: (current?.added ?? 0) + added
      });
    }
    const pattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text)?\\(\\s*(['"\`])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(pattern)) {
      const added = countTextLines(unescapeScriptText(match.groups?.content ?? ''));
      const current = files.get(path);
      files.set(path, {
        path,
        status: 'modified',
        added: (current?.added ?? 0) + added
      });
    }
  }
  return [...files.values()];
}

export function parseShellWriteCommands(projectRoot: string, workdir: string | null, command: string): FileEvidence[] {
  const files: FileEvidence[] = [];
  const lines = command.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heredoc = heredocTarget(line);
    if (heredoc) {
      const content: string[] = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        if (lines[cursor].trim() === heredoc.delimiter) {
          index = cursor;
          break;
        }
        content.push(lines[cursor]);
      }
      const path = projectRelativeShellPath(projectRoot, workdir, heredoc.path);
      if (path) files.push({ path, status: 'modified', added: countTextLines(content.join('\n')) });
      continue;
    }

    SHELL_REDIRECT_TARGET.lastIndex = 0;
    for (const match of line.matchAll(SHELL_REDIRECT_TARGET)) {
      const rawPath = match[2];
      if (!rawPath || /^\d?>&/.test(match[0])) continue;
      const path = projectRelativeShellPath(projectRoot, workdir, rawPath);
      if (path) files.push({ path, status: 'modified' });
    }
  }
  files.push(...scriptWriteEvidence({ projectRoot, workdir, pattern: PYTHON_TRIPLE_WRITE_TARGET, command }));
  files.push(...scriptWriteEvidence({ projectRoot, workdir, pattern: PYTHON_WRITE_TARGET, command }));
  files.push(...boundScriptWriteEvidence({ projectRoot, workdir, command, targets: pythonBoundTargets(command) }));
  files.push(...scriptWriteEvidence({ projectRoot, workdir, pattern: NODE_WRITE_TARGET, command }));
  return files;
}
