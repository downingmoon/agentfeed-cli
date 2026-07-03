import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';

export type ScriptWriteEvidenceContext = {
  readonly projectRoot: string;
  readonly workdir: string | null;
};

export type ScriptWriteEvidenceInput = ScriptWriteEvidenceContext & {
  readonly pattern: RegExp;
  readonly command: string;
};

export type VariableContentWriteEvidenceInput = ScriptWriteEvidenceInput & {
  readonly contentBindings: ReadonlyMap<string, string>;
};

export function unescapeScriptText(value: string): string {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scriptWriteEvidence(input: ScriptWriteEvidenceInput): FileEvidence[] {
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

export function contentBindingsFromPatterns(command: string, patterns: readonly RegExp[]): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const name = match.groups?.name;
      const content = match.groups?.content;
      if (name && content !== undefined) bindings.set(name, content);
    }
  }
  return bindings;
}

export function variableContentWriteEvidence(input: VariableContentWriteEvidenceInput): FileEvidence[] {
  const files: FileEvidence[] = [];
  input.pattern.lastIndex = 0;
  for (const match of input.command.matchAll(input.pattern)) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, match.groups?.path ?? '');
    const contentName = match.groups?.contentName;
    const content = contentName ? input.contentBindings.get(contentName) : undefined;
    if (!path || content === undefined) continue;
    files.push({
      path,
      status: 'modified',
      added: countTextLines(unescapeScriptText(content))
    });
  }
  return files;
}

export function mergeAddedEvidence(files: Map<string, FileEvidence>, path: string, added: number): void {
  const current = files.get(path);
  files.set(path, {
    path,
    status: 'modified',
    added: (current?.added ?? 0) + added
  });
}
