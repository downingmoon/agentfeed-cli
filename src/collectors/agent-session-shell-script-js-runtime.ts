import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { countTextLines } from './agent-session-core.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { changedPathWriteEvidence, escapeRegExp, mergeAddedEvidence, mergeChangedEvidence, scriptWriteEvidence, unescapeScriptText, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const JS_RUNTIME_PATH_BINDING = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*(['"`])(?<path>[^'"`]+)\2\s*;/g;
const JS_RUNTIME_TEXT_WRITE_TARGET = /\b(?:Bun\.write|Deno\.writeTextFile)\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<content>[\s\S]*?)\3/g;
const JS_RUNTIME_VARIABLE_TEXT_WRITE_TARGET = /\b(?:Bun\.write|Deno\.writeTextFile)\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;
const JS_RUNTIME_CHANGED_WRITE_TARGET = /\b(?:Bun\.write|Deno\.writeTextFile|Deno\.writeFile)\(\s*(['"`])(?<path>[^'"`]+)\1\s*,/g;
const JS_RUNTIME_WRITE_CALL = String.raw`\b(?:Bun\.write|Deno\.writeTextFile|Deno\.writeFile)\(`;

type RuntimePathBinding = {
  readonly name: string;
  readonly path: string;
};

function runtimePathBindings(command: string): RuntimePathBinding[] {
  const paths: RuntimePathBinding[] = [];
  JS_RUNTIME_PATH_BINDING.lastIndex = 0;
  for (const match of command.matchAll(JS_RUNTIME_PATH_BINDING)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) paths.push({ name, path });
  }
  return paths;
}

function runtimePathVariableWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const target of runtimePathBindings(command)) {
    const path = projectRelativeShellPath(context.projectRoot, context.workdir, target.path);
    if (!path) continue;
    const textPattern = new RegExp(`${JS_RUNTIME_WRITE_CALL}\\s*${escapeRegExp(target.name)}\\s*,\\s*(['"\`])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of command.matchAll(textPattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const variablePattern = new RegExp(`${JS_RUNTIME_WRITE_CALL}\\s*${escapeRegExp(target.name)}\\s*,\\s*(?<contentName>[A-Za-z_$][\\w$]*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? contentBindings.get(contentName) : undefined;
      if (content !== undefined) mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
    const changedPattern = new RegExp(`${JS_RUNTIME_WRITE_CALL}\\s*${escapeRegExp(target.name)}\\s*,`, 'g');
    if (changedPattern.test(command)) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

export function jsRuntimeWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  return [
    ...scriptWriteEvidence({ ...context, pattern: JS_RUNTIME_TEXT_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: JS_RUNTIME_VARIABLE_TEXT_WRITE_TARGET, command, contentBindings }),
    ...changedPathWriteEvidence({ ...context, pattern: JS_RUNTIME_CHANGED_WRITE_TARGET, command }),
    ...runtimePathVariableWriteEvidence(context, command, contentBindings)
  ];
}
