import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { countTextLines } from './agent-session-core.js';
import { contentBindingsFromPatterns, escapeRegExp, mergeAddedEvidence, scriptWriteEvidence, unescapeScriptText, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const NODE_CONTENT_BINDING = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(['"`])(?<content>[\s\S]*?)\2\s*;/g;
const NODE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?(?:writeFile|appendFile)(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<content>[\s\S]*?)\3/g;
const NODE_CONTENT_VARIABLE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?(?:writeFile|appendFile)(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;
const NODE_STREAM_TARGET = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\2[\s\S]*?\)\s*;/g;
const NODE_DIRECT_STREAM_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\1(?:\s*,[^)]*)?\)\.(?:write|end)\(\s*(['"`])(?<content>[\s\S]*?)\3/g;
const NODE_DIRECT_STREAM_VARIABLE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?createWriteStream\(\s*(['"`])(?<path>[^'"`]+)\1(?:\s*,[^)]*)?\)\.(?:write|end)\(\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;

export function nodeContentBindings(command: string): ReadonlyMap<string, string> {
  return contentBindingsFromPatterns(command, [NODE_CONTENT_BINDING]);
}

type BoundNodeStream = {
  readonly name: string;
  readonly path: string;
};

type NodeStreamWriteEvidenceInput = ScriptWriteEvidenceContext & {
  readonly command: string;
  readonly streams: readonly BoundNodeStream[];
  readonly contentBindings: ReadonlyMap<string, string>;
};

function nodeStreamTargets(command: string): BoundNodeStream[] {
  const streams: BoundNodeStream[] = [];
  NODE_STREAM_TARGET.lastIndex = 0;
  for (const match of command.matchAll(NODE_STREAM_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) streams.push({ name, path });
  }
  return streams;
}

function nodeStreamWriteEvidence(input: NodeStreamWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const stream of input.streams) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, stream.path);
    if (!path) continue;
    const textPattern = new RegExp(`\\b${escapeRegExp(stream.name)}\\.(?:write|end)\\(\\s*(['"\`])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(textPattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const variablePattern = new RegExp(`\\b${escapeRegExp(stream.name)}\\.(?:write|end)\\(\\s*(?<contentName>[A-Za-z_$][\\w$]*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (content === undefined) continue;
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
  }
  return [...files.values()];
}

export function nodeScriptWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  return [
    ...scriptWriteEvidence({ ...context, pattern: NODE_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: NODE_CONTENT_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...scriptWriteEvidence({ ...context, pattern: NODE_DIRECT_STREAM_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: NODE_DIRECT_STREAM_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...nodeStreamWriteEvidence({ ...context, command, streams: nodeStreamTargets(command), contentBindings })
  ];
}
