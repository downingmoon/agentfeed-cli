import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { nodeContentBindings, nodeScriptWriteEvidence } from './agent-session-shell-script-node.js';
import { pythonContentBindings, pythonScriptWriteEvidence } from './agent-session-shell-script-python.js';

const SHELL_REDIRECT_TARGET = /(?:^|\s)(?:\d?>|>>|>)\s*(['"]?)([^'"\s;&|<>]+)\1/g;
const SHELL_TEE_TARGET = /(?:^|\s)tee\s+(?:-[a-zA-Z]+\s+)*(['"]?)([^'"\s;&|<>]+)\1/g;

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

function contentBindings(command: string): ReadonlyMap<string, string> {
  return new Map([...pythonContentBindings(command), ...nodeContentBindings(command)]);
}

export function parseShellWriteCommands(projectRoot: string, workdir: string | null, command: string): FileEvidence[] {
  const files: FileEvidence[] = [];
  const context = { projectRoot, workdir };
  const boundContent = contentBindings(command);
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
  files.push(...pythonScriptWriteEvidence(context, command, boundContent));
  files.push(...nodeScriptWriteEvidence(context, command, boundContent));
  return files;
}
