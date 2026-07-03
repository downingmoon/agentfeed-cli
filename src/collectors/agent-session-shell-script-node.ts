import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { contentBindingsFromPatterns, scriptWriteEvidence, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const NODE_CONTENT_BINDING = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(['"`])(?<content>[\s\S]*?)\2\s*;/g;
const NODE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?writeFile(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<content>[\s\S]*?)\3/g;
const NODE_CONTENT_VARIABLE_WRITE_TARGET = /\b(?:[A-Za-z_$][\w$]*\.)?writeFile(?:Sync)?\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(?<contentName>[A-Za-z_$][\w$]*)\s*\)/g;

export function nodeContentBindings(command: string): ReadonlyMap<string, string> {
  return contentBindingsFromPatterns(command, [NODE_CONTENT_BINDING]);
}

export function nodeScriptWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  return [
    ...scriptWriteEvidence({ ...context, pattern: NODE_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: NODE_CONTENT_VARIABLE_WRITE_TARGET, command, contentBindings })
  ];
}
