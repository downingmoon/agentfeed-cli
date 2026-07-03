import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { countTextLines } from './agent-session-core.js';
import { changedPathWriteEvidence, contentBindingsFromPatterns, escapeRegExp, mergeAddedEvidence, mergeChangedEvidence, scriptWriteEvidence, unescapeScriptText, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';
import { jsRuntimeWriteEvidence } from './agent-session-shell-script-js-runtime.js';

const NODE_CONTENT_BINDING = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(['"`])(?<content>[\s\S]*?)\2\s*;/g;
const NODE_PATH_BINDING = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(['"`])(?<path>[^'"`]+)\2\s*;/g;
const NODE_RESOLVED_PATH_BINDING = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(?:[A-Za-z_$][\w$]*\.)?(?:join|resolve)\(\s*(['"`])(?<path>[^'"`]+)\2\s*\)\s*;/g;
const NODE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?(?:writeFile|appendFile)(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<content>[\s\S]*?)\3/g;
const NODE_CONTENT_VARIABLE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?(?:writeFile|appendFile)(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;
const NODE_CHANGED_WRITE_TARGET = /\b(?:await\s+)?(?:[A-Za-z_$][\w$]*\.)*(?:writeFile|appendFile)(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,/g;
const NODE_STREAM_TARGET = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\2[\s\S]*?\)\s*;/g;
const NODE_DIRECT_STREAM_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\1(?:\s*,[^)]*)?\)\.(?:write|end)\(\s*(['"`])(?<content>[\s\S]*?)\3/g;
const NODE_DIRECT_STREAM_VARIABLE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\1(?:\s*,[^)]*)?\)\.(?:write|end)\(\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;
const NODE_DIRECT_STREAM_CHANGED_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\1(?:\s*,[^)]*)?\)\.(?:write|end)\(\s*/g;
const NODE_FILEHANDLE_TARGET = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:[A-Za-z_$][\w$]*\.)*open\(\s*(['"`])(?<path>[^'"`]+)\2\s*,\s*(['"`])(?<mode>[^'"`]*)\4[\s\S]*?\)\s*;/g;
const NODE_DIRECT_FILEHANDLE_WRITE_TARGET = /\(\s*await\s+(?:[A-Za-z_$][\w$]*\.)*open\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<mode>[^'"`]*)\3[\s\S]*?\)\s*\)\.writeFile\(\s*(['"`])(?<content>[\s\S]*?)\5/g;
const NODE_DIRECT_FILEHANDLE_VARIABLE_WRITE_TARGET = /\(\s*await\s+(?:[A-Za-z_$][\w$]*\.)*open\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<mode>[^'"`]*)\3[\s\S]*?\)\s*\)\.writeFile\(\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;
const NODE_DIRECT_FILEHANDLE_CHANGED_TARGET = /\(\s*await\s+(?:[A-Za-z_$][\w$]*\.)*open\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<mode>[^'"`]*)\3[\s\S]*?\)\s*\)\.writeFile\(\s*/g;

export function nodeContentBindings(command: string): ReadonlyMap<string, string> {
  return contentBindingsFromPatterns(command, [NODE_CONTENT_BINDING]);
}

type BoundNodePath = {
  readonly name: string;
  readonly path: string;
};

type NodeBoundWriteEvidenceInput = ScriptWriteEvidenceContext & {
  readonly command: string;
  readonly targets: readonly BoundNodePath[];
  readonly contentBindings: ReadonlyMap<string, string>;
};

function nodePathBindings(command: string): BoundNodePath[] {
  const paths: BoundNodePath[] = [];
  for (const pattern of [NODE_PATH_BINDING, NODE_RESOLVED_PATH_BINDING]) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const name = match.groups?.name;
      const path = match.groups?.path;
      if (name && path) paths.push({ name, path });
    }
  }
  return paths;
}

function joinedNodePath(basePath: string, rawSegments: string): string | null {
  const segments: string[] = [];
  const pattern = /\s*,\s*(['"`])(?<segment>[^'"`]*?)\1/g;
  let cursor = 0;
  for (const match of rawSegments.matchAll(pattern)) {
    if (match.index !== cursor) return null;
    const segment = match.groups?.segment;
    if (!segment || segment.includes('${')) return null;
    segments.push(segment);
    cursor = match.index + match[0].length;
  }
  if (!segments.length || rawSegments.slice(cursor).trim()) return null;
  return [basePath, ...segments].join('/').replace(/\/+/g, '/');
}

function nodeStreamTargets(command: string): BoundNodePath[] {
  const streams: BoundNodePath[] = [];
  NODE_STREAM_TARGET.lastIndex = 0;
  for (const match of command.matchAll(NODE_STREAM_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) streams.push({ name, path });
  }
  return streams;
}

function nodeFileHandleTargets(command: string): BoundNodePath[] {
  const handles: BoundNodePath[] = [];
  NODE_FILEHANDLE_TARGET.lastIndex = 0;
  for (const match of command.matchAll(NODE_FILEHANDLE_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    const mode = match.groups?.mode ?? '';
    if (name && path && /[wax+]/.test(mode)) handles.push({ name, path });
  }
  return handles;
}

function nodeChangedWriteEvidence(context: ScriptWriteEvidenceContext, command: string): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  NODE_CHANGED_WRITE_TARGET.lastIndex = 0;
  for (const match of command.matchAll(NODE_CHANGED_WRITE_TARGET)) {
    const path = projectRelativeShellPath(context.projectRoot, context.workdir, match.groups?.path ?? '');
    if (path) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function nodePathWriteEvidence(input: NodeBoundWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const target of input.targets) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, target.path);
    if (!path) continue;
    const textPattern = new RegExp(`\\b(?:[A-Za-z_$][\\w$]*\\.)?(?:writeFile|appendFile)(?:Sync)?\\(\\s*${escapeRegExp(target.name)}\\s*,\\s*(['"\`])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(textPattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const variablePattern = new RegExp(`\\b(?:[A-Za-z_$][\\w$]*\\.)?(?:writeFile|appendFile)(?:Sync)?\\(\\s*${escapeRegExp(target.name)}\\s*,\\s*(?<contentName>[A-Za-z_$][\\w$]*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (content === undefined) continue;
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
    const targetPattern = new RegExp(`\\b(?:[A-Za-z_$][\\w$]*\\.)?(?:writeFile|appendFile)(?:Sync)?\\(\\s*${escapeRegExp(target.name)}\\s*,`, 'g');
    if (targetPattern.test(input.command)) mergeChangedEvidence(files, path);

    const joinedTarget = `(?:[A-Za-z_$][\\w$]*\\.)?(?:join|resolve)\\(\\s*${escapeRegExp(target.name)}(?<segments>[^)]*)\\)`;
    const joinedTextPattern = new RegExp(`\\b(?:[A-Za-z_$][\\w$]*\\.)*(?:writeFile|appendFile)(?:Sync)?\\(\\s*${joinedTarget}\\s*,\\s*(['"\`])(?<content>[\\s\\S]*?)\\2`, 'g');
    for (const match of input.command.matchAll(joinedTextPattern)) {
      const joinedPath = joinedNodePath(target.path, match.groups?.segments ?? '');
      const relativePath = joinedPath ? projectRelativeShellPath(input.projectRoot, input.workdir, joinedPath) : null;
      if (relativePath) mergeAddedEvidence(files, relativePath, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const joinedVariablePattern = new RegExp(`\\b(?:[A-Za-z_$][\\w$]*\\.)*(?:writeFile|appendFile)(?:Sync)?\\(\\s*${joinedTarget}\\s*,\\s*(?<contentName>[A-Za-z_$][\\w$]*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(joinedVariablePattern)) {
      const joinedPath = joinedNodePath(target.path, match.groups?.segments ?? '');
      const relativePath = joinedPath ? projectRelativeShellPath(input.projectRoot, input.workdir, joinedPath) : null;
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (relativePath && content !== undefined) mergeAddedEvidence(files, relativePath, countTextLines(unescapeScriptText(content)));
    }
    const joinedChangedPattern = new RegExp(`\\b(?:[A-Za-z_$][\\w$]*\\.)*(?:writeFile|appendFile)(?:Sync)?\\(\\s*${joinedTarget}\\s*,`, 'g');
    for (const match of input.command.matchAll(joinedChangedPattern)) {
      const joinedPath = joinedNodePath(target.path, match.groups?.segments ?? '');
      const relativePath = joinedPath ? projectRelativeShellPath(input.projectRoot, input.workdir, joinedPath) : null;
      if (relativePath) mergeChangedEvidence(files, relativePath);
    }
  }
  return [...files.values()];
}

function nodeStreamWriteEvidence(input: NodeBoundWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const target of input.targets) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, target.path);
    if (!path) continue;
    const textPattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.(?:write|end|writeFile)\\(\\s*(['"\`])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(textPattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const variablePattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.(?:write|end|writeFile)\\(\\s*(?<contentName>[A-Za-z_$][\\w$]*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (content === undefined) continue;
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
    const changedPattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.(?:write|end|writeFile)\\(\\s*`, 'g');
    if (changedPattern.test(input.command)) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

export function nodeScriptWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  return [
    ...scriptWriteEvidence({ ...context, pattern: NODE_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: NODE_CONTENT_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...nodeChangedWriteEvidence(context, command),
    ...scriptWriteEvidence({ ...context, pattern: NODE_DIRECT_STREAM_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: NODE_DIRECT_STREAM_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...changedPathWriteEvidence({ ...context, pattern: NODE_DIRECT_STREAM_CHANGED_TARGET, command }),
    ...scriptWriteEvidence({ ...context, pattern: NODE_DIRECT_FILEHANDLE_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: NODE_DIRECT_FILEHANDLE_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...changedPathWriteEvidence({ ...context, pattern: NODE_DIRECT_FILEHANDLE_CHANGED_TARGET, command }),
    ...jsRuntimeWriteEvidence(context, command, contentBindings),
    ...nodePathWriteEvidence({ ...context, command, targets: nodePathBindings(command), contentBindings }),
    ...nodeStreamWriteEvidence({ ...context, command, targets: nodeStreamTargets(command), contentBindings }),
    ...nodeStreamWriteEvidence({ ...context, command, targets: nodeFileHandleTargets(command), contentBindings })
  ];
}
