import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { pythonLiteralJoinPath, pythonLiteralPathDivision } from './agent-session-shell-script-python-path-bindings.js';
import { mergeAddedEvidence, mergeChangedEvidence, unescapeScriptText, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const PYTHON_TRIPLE_PATH_JOINPATH_WRITE_TARGET = /\bPath\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)\.joinpath\((?<segments>[^)]*)\)\.(?:write\(\s*|write_text\(\s*(?:data\s*=\s*)?)(?<contentQuote>'''|""")(?<content>[\s\S]*?)\k<contentQuote>/g;
const PYTHON_PATH_JOINPATH_WRITE_TARGET = /\bPath\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)\.joinpath\((?<segments>[^)]*)\)\.(?:write\(\s*|write_text\(\s*(?:data\s*=\s*)?)(?<contentQuote>['"])(?<content>[\s\S]*?)\k<contentQuote>/g;
const PYTHON_CHANGED_PATH_JOINPATH_WRITE_TARGET = /\bPath\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)\.joinpath\((?<segments>[^)]*)\)\.write(?:_text|_bytes)?\(/g;
const PYTHON_PATH_JOINPATH_VARIABLE_WRITE_TARGET = /\bPath\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)\.joinpath\((?<segments>[^)]*)\)\.(?:write\(\s*|write_text\(\s*(?:data\s*=\s*)?)(?<contentName>[A-Za-z_]\w*)\s*(?:,[^\n)]*)?\)/g;
const PYTHON_TRIPLE_PATH_DIVISION_WRITE_TARGET = /\(\s*Path\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)(?<segments>(?:\s*\/\s*(['"])[^'"]+\4)+)\s*\)\.(?:write\(\s*|write_text\(\s*(?:data\s*=\s*)?)(?<contentQuote>'''|""")(?<content>[\s\S]*?)\k<contentQuote>/g;
const PYTHON_PATH_DIVISION_VARIABLE_WRITE_TARGET = /\(\s*Path\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)(?<segments>(?:\s*\/\s*(['"])[^'"]+\4)+)\s*\)\.(?:write\(\s*|write_text\(\s*(?:data\s*=\s*)?)(?<contentName>[A-Za-z_]\w*)\s*(?:,[^\n)]*)?\)/g;
const PYTHON_CHANGED_PATH_DIVISION_WRITE_TARGET = /\(\s*Path\(\s*(?<baseQuote>['"])(?<basePath>[^'"]+)\k<baseQuote>\s*\)(?<segments>(?:\s*\/\s*(['"])[^'"]+\4)+)\s*\)\.write(?:_text|_bytes)?\(/g;
const PYTHON_TRIPLE_PATH_OPEN_WRITE_TARGET = /\bPath\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*\)\.open\((?<openArgs>[^\n)]*)\)\.write\(\s*(?<contentQuote>'''|""")(?<content>[\s\S]*?)\k<contentQuote>/g;
const PYTHON_PATH_OPEN_WRITE_TARGET = /\bPath\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*\)\.open\((?<openArgs>[^\n)]*)\)\.write\(\s*(?<contentQuote>['"])(?<content>(?:\\.|(?!\k<contentQuote>)[^\r\n])*)\k<contentQuote>/g;
const PYTHON_PATH_OPEN_VARIABLE_WRITE_TARGET = /\bPath\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*\)\.open\((?<openArgs>[^\n)]*)\)\.write\(\s*(?<contentName>[A-Za-z_]\w*)\s*(?:,[^\n)]*)?\)/g;
const PYTHON_CHANGED_PATH_OPEN_WRITE_TARGET = /\bPath\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*\)\.open\((?<openArgs>[^\n)]*)\)\.write\(/g;

type DirectPathWriteEvidenceInput = ScriptWriteEvidenceContext & {
  readonly command: string;
  readonly contentBindings: ReadonlyMap<string, string>;
};

export function directPythonPathWriteEvidence(input: DirectPathWriteEvidenceInput): FileEvidence[] {
  return [
    ...directJoinPathWriteEvidence(input),
    ...directDivisionWriteEvidence(input),
    ...directOpenWriteEvidence(input)
  ];
}

function directJoinPathWriteEvidence(input: DirectPathWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const pattern of [PYTHON_TRIPLE_PATH_JOINPATH_WRITE_TARGET, PYTHON_PATH_JOINPATH_WRITE_TARGET]) {
    pattern.lastIndex = 0;
    for (const match of input.command.matchAll(pattern)) {
      const path = directJoinPath(input, match);
      if (path) mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
  }
  PYTHON_PATH_JOINPATH_VARIABLE_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_PATH_JOINPATH_VARIABLE_WRITE_TARGET)) {
    const path = directJoinPath(input, match);
    if (!path) continue;
    const contentName = match.groups?.contentName;
    const content = contentName ? input.contentBindings.get(contentName) : undefined;
    if (content === undefined) mergeChangedEvidence(files, path);
    else mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
  }
  PYTHON_CHANGED_PATH_JOINPATH_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_CHANGED_PATH_JOINPATH_WRITE_TARGET)) {
    const path = directJoinPath(input, match);
    if (path) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function directDivisionWriteEvidence(input: DirectPathWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  PYTHON_TRIPLE_PATH_DIVISION_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_TRIPLE_PATH_DIVISION_WRITE_TARGET)) {
    const path = directDivisionPath(input, match);
    if (path) mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
  }
  PYTHON_PATH_DIVISION_VARIABLE_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_PATH_DIVISION_VARIABLE_WRITE_TARGET)) {
    const path = directDivisionPath(input, match);
    if (!path) continue;
    const contentName = match.groups?.contentName;
    const content = contentName ? input.contentBindings.get(contentName) : undefined;
    if (content === undefined) mergeChangedEvidence(files, path);
    else mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
  }
  PYTHON_CHANGED_PATH_DIVISION_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_CHANGED_PATH_DIVISION_WRITE_TARGET)) {
    const path = directDivisionPath(input, match);
    if (path) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function directOpenWriteEvidence(input: DirectPathWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const pattern of [PYTHON_TRIPLE_PATH_OPEN_WRITE_TARGET, PYTHON_PATH_OPEN_WRITE_TARGET]) {
    pattern.lastIndex = 0;
    for (const match of input.command.matchAll(pattern)) {
      const path = directOpenPath(input, match);
      if (path) mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
  }
  PYTHON_PATH_OPEN_VARIABLE_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_PATH_OPEN_VARIABLE_WRITE_TARGET)) {
    const path = directOpenPath(input, match);
    if (!path) continue;
    const contentName = match.groups?.contentName;
    const content = contentName ? input.contentBindings.get(contentName) : undefined;
    if (content === undefined) mergeChangedEvidence(files, path);
    else mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
  }
  PYTHON_CHANGED_PATH_OPEN_WRITE_TARGET.lastIndex = 0;
  for (const match of input.command.matchAll(PYTHON_CHANGED_PATH_OPEN_WRITE_TARGET)) {
    const path = directOpenPath(input, match);
    if (path) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function directJoinPath(context: ScriptWriteEvidenceContext, match: RegExpMatchArray): string | null {
  const basePath = match.groups?.basePath;
  const joinedPath = basePath ? pythonLiteralJoinPath(basePath, match.groups?.segments ?? '') : null;
  return joinedPath ? projectRelativeShellPath(context.projectRoot, context.workdir, joinedPath) : null;
}

function directDivisionPath(context: ScriptWriteEvidenceContext, match: RegExpMatchArray): string | null {
  const basePath = match.groups?.basePath;
  const dividedPath = basePath ? pythonLiteralPathDivision(basePath, match.groups?.segments ?? '') : null;
  return dividedPath ? projectRelativeShellPath(context.projectRoot, context.workdir, dividedPath) : null;
}

function directOpenPath(context: ScriptWriteEvidenceContext, match: RegExpMatchArray): string | null {
  const mode = pythonOpenMode(match.groups?.openArgs ?? '');
  const path = match.groups?.path;
  return path && /[wax+]/.test(mode) ? projectRelativeShellPath(context.projectRoot, context.workdir, path) : null;
}

function pythonOpenMode(openArgs: string): string {
  const positional = /^\s*(?<quote>['"])(?<mode>[^'"]*)\k<quote>/.exec(openArgs)?.groups?.mode;
  if (positional !== undefined) return positional;
  return /\bmode\s*=\s*(?<quote>['"])(?<mode>[^'"]*)\k<quote>/.exec(openArgs)?.groups?.mode ?? '';
}
