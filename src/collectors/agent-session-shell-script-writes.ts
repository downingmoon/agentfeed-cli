import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { nodeContentBindings, nodeScriptWriteEvidence } from './agent-session-shell-script-node.js';
import { pythonContentBindings, pythonScriptWriteEvidence } from './agent-session-shell-script-python.js';

const SHELL_REDIRECT_TARGET = /(?:^|\s)(?:\d?>|>>|>)\s*(['"]?)([^'"\s;&|<>]+)\1/g;
const SHELL_TEE_TARGET = /(?:^|\s)tee\s+(?:-[a-zA-Z]+\s+)*(['"]?)([^'"\s;&|<>]+)\1/g;
const APPLY_PATCH_FILE_HEADER = /^\*\*\* (?<kind>Add|Update|Delete) File: (?<path>.+)$/;

type ApplyPatchFile = {
  readonly path: string;
  readonly status: FileEvidence['status'];
  readonly added: number;
  readonly removed: number;
};

function heredocDelimiter(line: string): string | null {
  return /<<\s*['"]?(?<delimiter>[A-Za-z0-9_:-]+)['"]?/.exec(line)?.groups?.delimiter ?? null;
}

function heredocTarget(line: string): { readonly path: string; readonly delimiter: string } | null {
  const delimiter = heredocDelimiter(line);
  if (!delimiter) return null;
  SHELL_REDIRECT_TARGET.lastIndex = 0;
  const redirect = [...line.matchAll(SHELL_REDIRECT_TARGET)].at(-1)?.[2];
  if (redirect) return { path: redirect, delimiter };
  SHELL_TEE_TARGET.lastIndex = 0;
  const tee = [...line.matchAll(SHELL_TEE_TARGET)].at(-1)?.[2];
  return tee ? { path: tee, delimiter } : null;
}

function contentBindings(command: string): ReadonlyMap<string, string> {
  return new Map([...pythonContentBindings(command), ...nodeContentBindings(command)]);
}

function applyPatchDelimiter(line: string): string | null {
  if (!/(?:^|\s)apply_patch(?:\s|$)/.test(line)) return null;
  return heredocDelimiter(line);
}

function applyPatchStatus(kind: string): FileEvidence['status'] {
  if (kind === 'Add') return 'added';
  if (kind === 'Delete') return 'deleted';
  return 'modified';
}

function parseApplyPatchEvidence(projectRoot: string, workdir: string | null, content: readonly string[]): FileEvidence[] {
  const files: FileEvidence[] = [];
  let current: ApplyPatchFile | null = null;

  const flush = (): void => {
    if (!current) return;
    const path = projectRelativeShellPath(projectRoot, workdir, current.path);
    if (path) files.push({ path, status: current.status, added: current.added, removed: current.removed });
    current = null;
  };

  for (const line of content) {
    const header = APPLY_PATCH_FILE_HEADER.exec(line);
    const kind = header?.groups?.kind;
    const filePath = header?.groups?.path;
    if (kind && filePath) {
      flush();
      current = { path: filePath, status: applyPatchStatus(kind), added: 0, removed: 0 };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) current = { ...current, added: current.added + 1 };
    if (line.startsWith('-') && !line.startsWith('---')) current = { ...current, removed: current.removed + 1 };
  }
  flush();
  return files;
}

export function parseShellWriteCommands(projectRoot: string, workdir: string | null, command: string): FileEvidence[] {
  const files: FileEvidence[] = [];
  const context = { projectRoot, workdir };
  const boundContent = contentBindings(command);
  const lines = command.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const applyPatch = applyPatchDelimiter(line);
    if (applyPatch) {
      const content: string[] = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        if (lines[cursor].trim() === applyPatch) {
          index = cursor;
          break;
        }
        content.push(lines[cursor]);
      }
      files.push(...parseApplyPatchEvidence(projectRoot, workdir, content));
      continue;
    }

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
  files.push(...pythonScriptWriteEvidence(context, command, boundContent));
  files.push(...nodeScriptWriteEvidence(context, command, boundContent));
  return files;
}
