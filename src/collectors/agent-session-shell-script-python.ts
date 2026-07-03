import { literalDumpLineCount, PYTHON_LITERAL_COLLECTION } from './agent-session-shell-script-python-literals.js';
import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { pythonBoundTargets, pythonStringPathTargets, type BoundScriptTarget } from './agent-session-shell-script-python-path-bindings.js';
import { contentBindingsFromPatterns, escapeRegExp, mergeAddedEvidence, scriptWriteEvidence, unescapeScriptText, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const PYTHON_TRIPLE_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*('''|""")(?<content>[\s\S]*?)\3/g;
const PYTHON_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*(['"])(?<content>[\s\S]*?)\3/g;
const PYTHON_CHANGED_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text|_bytes)?\(/g;
const PYTHON_TRIPLE_CONTENT_BINDING = /\b(?<name>[A-Za-z_]\w*)\s*=\s*('''|""")(?<content>[\s\S]*?)\2/g;
const PYTHON_CONTENT_VARIABLE_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*(?<contentName>[A-Za-z_]\w*)\s*(?:,[^\n)]*)?\)/g;
const PYTHON_DUMP_OPEN_TARGET = /\b(?:json\.dump|yaml\.(?:safe_dump|dump))\([\s\S]*?,\s*open\(\s*(['"])(?<path>[^'"]+)\1\s*,\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)/g;
const PYTHON_DUMP_PATH_OPEN_TARGET = /\b(?:json\.dump|yaml\.(?:safe_dump|dump))\([\s\S]*?,\s*Path\(\s*(['"])(?<path>[^'"]+)\1\s*\)\.open\(\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)/g;
const PYTHON_DUMP_LITERAL_OPEN_TARGET = new RegExp(String.raw`\b(?<serializer>json\.dump|yaml\.(?:safe_dump|dump))\(\s*${PYTHON_LITERAL_COLLECTION}\s*,\s*open\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*,\s*(?<modeQuote>['"])(?<mode>[^'"]*)\k<modeQuote>[\s\S]*?\)\s*(?:,[^\n)]*)?\)`, 'g');
const PYTHON_DUMP_LITERAL_PATH_OPEN_TARGET = new RegExp(String.raw`\b(?<serializer>json\.dump|yaml\.(?:safe_dump|dump))\(\s*${PYTHON_LITERAL_COLLECTION}\s*,\s*Path\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*\)\.open\(\s*(?<modeQuote>['"])(?<mode>[^'"]*)\k<modeQuote>[\s\S]*?\)\s*(?:,[^\n)]*)?\)`, 'g');

export function pythonContentBindings(command: string): ReadonlyMap<string, string> {
  return contentBindingsFromPatterns(command, [PYTHON_TRIPLE_CONTENT_BINDING]);
}

type BoundScriptWriteEvidenceInput = ScriptWriteEvidenceContext & {
  readonly command: string;
  readonly targets: readonly BoundScriptTarget[];
  readonly contentBindings: ReadonlyMap<string, string>;
};

function mergeChangedEvidence(files: Map<string, FileEvidence>, path: string): void {
  if (!files.has(path)) files.set(path, { path, status: 'modified' });
}

function pathVariableWriteEvidence(input: BoundScriptWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const target of input.targets) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, target.path);
    if (!path) continue;
    const pathArgument = escapeRegExp(target.name);
    const openWriter = `open\\(\\s*${pathArgument}\\s*,\\s*(['"])[^'"]*[wax+][^'"]*\\1[\\s\\S]*?\\)\\.write`;
    const pathWriter = `Path\\(\\s*${pathArgument}\\s*\\)\\.write_(?:text|bytes)`;
    const writerTarget = `(?:${openWriter}|${pathWriter})`;

    const triplePattern = new RegExp(`\\b${writerTarget}\\(\\s*('''|""")(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(triplePattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const textPattern = new RegExp(`\\b${writerTarget}\\(\\s*(['"])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(textPattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const variablePattern = new RegExp(`\\b${writerTarget}\\(\\s*(?<contentName>[A-Za-z_]\\w*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (content === undefined) continue;
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
    const targetPattern = new RegExp(`\\b${writerTarget}\\(`, 'g');
    if (targetPattern.test(input.command)) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function boundScriptWriteEvidence(input: BoundScriptWriteEvidenceInput): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const target of input.targets) {
    const path = projectRelativeShellPath(input.projectRoot, input.workdir, target.path);
    if (!path) continue;
    const dumpPattern = new RegExp(`\\b(?:json\\.dump|yaml\\.(?:safe_dump|dump))\\([\\s\\S]*?,\\s*${escapeRegExp(target.name)}\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(dumpPattern)) {
      if (match[0]) mergeChangedEvidence(files, path);
    }
    const literalDumpPattern = new RegExp(`\\b(?<serializer>json\\.dump|yaml\\.(?:safe_dump|dump))\\(\\s*${PYTHON_LITERAL_COLLECTION}\\s*,\\s*${escapeRegExp(target.name)}\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(literalDumpPattern)) {
      const added = literalDumpLineCount(match.groups?.serializer ?? '', match.groups?.payload ?? '', match[0]);
      if (added != null) mergeAddedEvidence(files, path, added);
    }
    const triplePattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text)?\\(\\s*('''|""")(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(triplePattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const pattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text)?\\(\\s*(['"\`])(?<content>[\\s\\S]*?)\\1`, 'g');
    for (const match of input.command.matchAll(pattern)) {
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(match.groups?.content ?? '')));
    }
    const variablePattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text|_bytes)?\\(\\s*(?<contentName>[A-Za-z_]\\w*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (content === undefined) mergeChangedEvidence(files, path);
      else mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
    const targetPattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text|_bytes)?\\(`, 'g');
    if (targetPattern.test(input.command)) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function pythonChangedWriteTargetEvidence(context: ScriptWriteEvidenceContext, command: string): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  PYTHON_CHANGED_WRITE_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_CHANGED_WRITE_TARGET)) {
    const path = projectRelativeShellPath(context.projectRoot, context.workdir, match.groups?.path ?? '');
    if (path) mergeChangedEvidence(files, path);
  }
  return [...files.values()];
}

function pythonDumpTargetEvidence(context: ScriptWriteEvidenceContext, command: string): FileEvidence[] {
  const files = new Map<string, FileEvidence>();
  for (const pattern of [PYTHON_DUMP_OPEN_TARGET, PYTHON_DUMP_PATH_OPEN_TARGET]) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const mode = match.groups?.mode ?? '';
      const path = projectRelativeShellPath(context.projectRoot, context.workdir, match.groups?.path ?? '');
      if (path && /[wax+]/.test(mode)) mergeChangedEvidence(files, path);
    }
  }
  for (const pattern of [PYTHON_DUMP_LITERAL_OPEN_TARGET, PYTHON_DUMP_LITERAL_PATH_OPEN_TARGET]) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const mode = match.groups?.mode ?? '';
      const path = projectRelativeShellPath(context.projectRoot, context.workdir, match.groups?.path ?? '');
      const added = literalDumpLineCount(match.groups?.serializer ?? '', match.groups?.payload ?? '', match[0]);
      if (path && /[wax+]/.test(mode) && added != null) mergeAddedEvidence(files, path, added);
    }
  }
  return [...files.values()];
}

export function pythonScriptWriteEvidence(context: ScriptWriteEvidenceContext, command: string, contentBindings: ReadonlyMap<string, string>): FileEvidence[] {
  return [
    ...scriptWriteEvidence({ ...context, pattern: PYTHON_TRIPLE_WRITE_TARGET, command }),
    ...scriptWriteEvidence({ ...context, pattern: PYTHON_WRITE_TARGET, command }),
    ...pythonChangedWriteTargetEvidence(context, command),
    ...variableContentWriteEvidence({ ...context, pattern: PYTHON_CONTENT_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...pythonDumpTargetEvidence(context, command),
    ...pathVariableWriteEvidence({ ...context, command, targets: pythonStringPathTargets(command), contentBindings }),
    ...boundScriptWriteEvidence({ ...context, command, targets: pythonBoundTargets(command), contentBindings })
  ];
}
