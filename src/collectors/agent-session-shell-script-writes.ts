import { isAbsolute, resolve } from 'node:path';
import { countTextLines } from './agent-session-core.js';
import { applyPatchDelimiter, parseApplyPatchEvidence } from './agent-session-shell-apply-patch.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { nodeContentBindings, nodeScriptWriteEvidence } from './agent-session-shell-script-node.js';
import { pythonContentBindings, pythonScriptWriteEvidence } from './agent-session-shell-script-python.js';
import { unescapeScriptText } from './agent-session-shell-script-write-shared.js';

const SHELL_REDIRECT_TARGET = /(?:^|\s)(?:\d?>|>>|>)\s*(['"]?)([^'"\s;&|<>]+)\1/g;
const SHELL_TEE_TARGET = /(?:^|\s)tee\s+(?:-[a-zA-Z]+\s+)*(['"]?)([^'"\s;&|<>]+)\1/g;
const SHELL_PRINTF_SINGLE_REDIRECT = /^\s*printf\s+(?:--\s+)?'(?<content>[^']*)'\s*(?:\d?>|>>|>)\s*(['"]?)(?<path>[^'"\s;&|<>]+)\2/;
const SHELL_PRINTF_DOUBLE_REDIRECT = /^\s*printf\s+(?:--\s+)?"(?<content>(?:\\"|[^"])*)"\s*(?:\d?>|>>|>)\s*(['"]?)(?<path>[^'"\s;&|<>]+)\2/;
const SHELL_PRINTF_FORMAT_SINGLE_REDIRECT = /^\s*printf\s+(?:--\s+)?'(?<format>[^']*)'(?<args>.*?)\s*(?:\d?>|>>|>)\s*(['"]?)(?<path>[^'"\s;&|<>]+)\3/;
const SHELL_PRINTF_FORMAT_DOUBLE_REDIRECT = /^\s*printf\s+(?:--\s+)?"(?<format>(?:\\"|[^"])*)"(?<args>.*?)\s*(?:\d?>|>>|>)\s*(['"]?)(?<path>[^'"\s;&|<>]+)\3/;
const SHELL_ECHO_SINGLE_REDIRECT = /^\s*echo\s+(?<options>-[A-Za-z]+\s+)?'(?<content>[^']*)'\s*(?:\d?>|>>|>)\s*(['"]?)(?<path>[^'"\s;&|<>]+)\3/;
const SHELL_ECHO_DOUBLE_REDIRECT = /^\s*echo\s+(?<options>-[A-Za-z]+\s+)?"(?<content>(?:\\"|[^"])*)"\s*(?:\d?>|>>|>)\s*(['"]?)(?<path>[^'"\s;&|<>]+)\3/;
const SHELL_CD_PREFIX = /^\s*cd\s+(['"]?)(?<path>[^'"\s;&|<>]+)\1\s*(?:&&|;)\s*(?<rest>.*)$/;
const SHELL_CD_LINE = /^\s*cd\s+(['"]?)(?<path>[^'"\s;&|<>]+)\1\s*$/;

type ScriptCommandBucket = {
  readonly workdir: string | null;
  readonly lines: string[];
};

function heredocDelimiter(line: string): string | null {
  return /<<\s*['"]?(?<delimiter>[A-Za-z0-9_:-]+)['"]?/.exec(line)?.groups?.delimiter ?? null;
}

function heredocRedirectPath(line: string): string | null {
  SHELL_REDIRECT_TARGET.lastIndex = 0;
  const redirects = [...line.matchAll(SHELL_REDIRECT_TARGET)]
    .filter((match) => !/^\s*[2-9]>/.test(match[0]))
    .map((match) => match[2])
    .filter((path) => path && path !== '/dev/null');
  return redirects.at(-1) ?? null;
}

function heredocTarget(line: string): { readonly path: string; readonly delimiter: string } | null {
  const delimiter = heredocDelimiter(line);
  if (!delimiter) return null;
  SHELL_TEE_TARGET.lastIndex = 0;
  const tee = [...line.matchAll(SHELL_TEE_TARGET)].at(-1)?.[2];
  if (tee) return { path: tee, delimiter };
  const redirect = heredocRedirectPath(line);
  if (redirect) return { path: redirect, delimiter };
  return null;
}

function contentBindings(command: string): ReadonlyMap<string, string> {
  return new Map([...pythonContentBindings(command), ...nodeContentBindings(command)]);
}

function shellQuotedArguments(value: string): string[] {
  const args: string[] = [];
  const pattern = /'(?<single>[^']*)'|"(?<double>(?:\\"|[^"])*)"/g;
  for (const match of value.matchAll(pattern)) {
    const content = match.groups?.single ?? match.groups?.double;
    if (content !== undefined) args.push(content.replace(/\\"/g, '"'));
  }
  return args;
}

function printfFormatRedirectEvidence(projectRoot: string, workdir: string | null, line: string): FileEvidence | null {
  const printf = SHELL_PRINTF_FORMAT_SINGLE_REDIRECT.exec(line) ?? SHELL_PRINTF_FORMAT_DOUBLE_REDIRECT.exec(line);
  const format = unescapeScriptText(printf?.groups?.format ?? '');
  if (!printf || format !== '%s\n') return null;
  const args = shellQuotedArguments(printf.groups?.args ?? '');
  if (!args.length) return null;
  const path = projectRelativeShellPath(projectRoot, workdir, printf.groups?.path ?? '');
  if (!path) return null;
  return { path, status: 'modified', added: countTextLines(args.join('\n')) };
}

function shellLiteralRedirectEvidence(projectRoot: string, workdir: string | null, line: string): FileEvidence | null {
  const formatted = printfFormatRedirectEvidence(projectRoot, workdir, line);
  if (formatted) return formatted;

  const printf = SHELL_PRINTF_SINGLE_REDIRECT.exec(line) ?? SHELL_PRINTF_DOUBLE_REDIRECT.exec(line);
  if (printf) {
    const path = projectRelativeShellPath(projectRoot, workdir, printf.groups?.path ?? '');
    if (!path) return null;
    return { path, status: 'modified', added: countTextLines(unescapeScriptText(printf.groups?.content ?? '')) };
  }

  const echo = SHELL_ECHO_SINGLE_REDIRECT.exec(line) ?? SHELL_ECHO_DOUBLE_REDIRECT.exec(line);
  if (!echo) return null;
  const path = projectRelativeShellPath(projectRoot, workdir, echo.groups?.path ?? '');
  if (!path) return null;
  const rawContent = echo.groups?.content ?? '';
  const options = echo.groups?.options ?? '';
  const content = options.includes('e') ? unescapeScriptText(rawContent) : rawContent;
  return { path, status: 'modified', added: countTextLines(content) };
}

function shellWorkdir(projectRoot: string, workdir: string | null, rawPath: string): string | null {
  if (rawPath === '.') return workdir ?? projectRoot;
  const path = projectRelativeShellPath(projectRoot, workdir, rawPath);
  return path ? resolve(projectRoot, path) : null;
}

function nextShellWorkdir(projectRoot: string, workdir: string | null, insideProject: boolean, rawPath: string): string | null {
  if (!insideProject && !isAbsolute(rawPath)) return null;
  return shellWorkdir(projectRoot, insideProject ? workdir : null, rawPath);
}

export function parseShellWriteCommands(projectRoot: string, workdir: string | null, command: string): FileEvidence[] {
  const files: FileEvidence[] = [];
  const scriptBuckets = new Map<string, ScriptCommandBucket>();
  const scriptBucket = (nextWorkdir: string | null): ScriptCommandBucket => {
    const key = nextWorkdir ?? '';
    const existing = scriptBuckets.get(key);
    if (existing) return existing;
    const created: ScriptCommandBucket = { workdir: nextWorkdir, lines: [] };
    scriptBuckets.set(key, created);
    return created;
  };
  const lines = command.split(/\r?\n/);
  let currentWorkdir = workdir;
  let workdirInsideProject = true;
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    const cdPrefix = SHELL_CD_PREFIX.exec(line);
    if (cdPrefix?.groups?.path) {
      const nextWorkdir = nextShellWorkdir(projectRoot, currentWorkdir, workdirInsideProject, cdPrefix.groups.path);
      if (!nextWorkdir) {
        workdirInsideProject = false;
        continue;
      }
      currentWorkdir = nextWorkdir;
      workdirInsideProject = true;
      line = cdPrefix.groups.rest ?? '';
    } else {
      const cdLine = SHELL_CD_LINE.exec(line);
      if (cdLine?.groups?.path) {
        const nextWorkdir = nextShellWorkdir(projectRoot, currentWorkdir, workdirInsideProject, cdLine.groups.path);
        workdirInsideProject = Boolean(nextWorkdir);
        if (nextWorkdir) currentWorkdir = nextWorkdir;
      }
      if (cdLine) continue;
    }
    if (!workdirInsideProject) continue;

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
      files.push(...parseApplyPatchEvidence(projectRoot, currentWorkdir, content));
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
      const path = projectRelativeShellPath(projectRoot, currentWorkdir, heredoc.path);
      if (path) files.push({ path, status: 'modified', added: countTextLines(content.join('\n')) });
      continue;
    }

    const scriptDelimiter = heredocDelimiter(line);
    if (scriptDelimiter) {
      const bucket = scriptBucket(currentWorkdir);
      bucket.lines.push(line);
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        bucket.lines.push(lines[cursor]);
        if (lines[cursor].trim() === scriptDelimiter) {
          index = cursor;
          break;
        }
      }
      continue;
    }

    const literalRedirect = shellLiteralRedirectEvidence(projectRoot, currentWorkdir, line);
    if (literalRedirect) {
      files.push(literalRedirect);
      continue;
    }

    SHELL_REDIRECT_TARGET.lastIndex = 0;
    for (const match of line.matchAll(SHELL_REDIRECT_TARGET)) {
      const rawPath = match[2];
      if (!rawPath || /^\d?>&/.test(match[0])) continue;
      const path = projectRelativeShellPath(projectRoot, currentWorkdir, rawPath);
      if (path) files.push({ path, status: 'modified' });
    }
    scriptBucket(currentWorkdir).lines.push(line);
  }
  for (const bucket of scriptBuckets.values()) {
    const scriptCommand = bucket.lines.join('\n');
    const boundContent = contentBindings(scriptCommand);
    const context = { projectRoot, workdir: bucket.workdir };
    files.push(...pythonScriptWriteEvidence(context, scriptCommand, boundContent));
    files.push(...nodeScriptWriteEvidence(context, scriptCommand, boundContent));
  }
  return files;
}
