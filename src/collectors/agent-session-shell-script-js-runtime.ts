import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { changedPathWriteEvidence, scriptWriteEvidence, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const JS_RUNTIME_TEXT_WRITE_TARGET = /\b(?:Bun\.write|Deno\.writeTextFile)\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(['"`])(?<content>[\s\S]*?)\3/g;
const JS_RUNTIME_VARIABLE_TEXT_WRITE_TARGET = /\b(?:Bun\.write|Deno\.writeTextFile)\(\s*(['"`])(?<path>[^'"`]+)\1\s*,\s*(?<contentName>[A-Za-z_$][\w$]*)\s*(?:,[^\n)]*)?\)/g;
const JS_RUNTIME_CHANGED_WRITE_TARGET = /\b(?:Bun\.write|Deno\.writeTextFile|Deno\.writeFile)\(\s*(['"`])(?<path>[^'"`]+)\1\s*,/g;

export function jsRuntimeWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  return [
    ...scriptWriteEvidence({ ...context, pattern: JS_RUNTIME_TEXT_WRITE_TARGET, command }),
    ...variableContentWriteEvidence({ ...context, pattern: JS_RUNTIME_VARIABLE_TEXT_WRITE_TARGET, command, contentBindings }),
    ...changedPathWriteEvidence({ ...context, pattern: JS_RUNTIME_CHANGED_WRITE_TARGET, command })
  ];
}
