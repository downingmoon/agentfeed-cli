import { countTextLines } from './agent-session-core.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { projectRelativeShellPath } from './agent-session-shell-paths.js';
import { contentBindingsFromPatterns, escapeRegExp, mergeAddedEvidence, scriptWriteEvidence, unescapeScriptText, variableContentWriteEvidence, type ScriptWriteEvidenceContext } from './agent-session-shell-script-write-shared.js';

const PYTHON_TRIPLE_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*('''|""")(?<content>[\s\S]*?)\3/g;
const PYTHON_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*(['"])(?<content>[\s\S]*?)\3/g;
const PYTHON_TRIPLE_CONTENT_BINDING = /\b(?<name>[A-Za-z_]\w*)\s*=\s*('''|""")(?<content>[\s\S]*?)\2/g;
const PYTHON_CONTENT_VARIABLE_WRITE_TARGET = /\b(?:Path|open)\(\s*(['"])(?<path>[^'"]+)\1[\s\S]*?\)\.write(?:_text)?\(\s*(?<contentName>[A-Za-z_]\w*)\s*(?:,[^\n)]*)?\)/g;
const PYTHON_PATH_BINDING_TARGET = /\b(?<name>[A-Za-z_]\w*)\s*=\s*Path\(\s*(['"])(?<path>[^'"]+)\2\s*\)/g;
const PYTHON_OPEN_BINDING_TARGET = /\bwith\s+open\(\s*(['"])(?<path>[^'"]+)\1\s*,\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)\s+as\s+(?<name>[A-Za-z_]\w*)\s*:/g;
const PYTHON_DUMP_OPEN_TARGET = /\b(?:json\.dump|yaml\.(?:safe_dump|dump))\([\s\S]*?,\s*open\(\s*(['"])(?<path>[^'"]+)\1\s*,\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)/g;
const PYTHON_DUMP_PATH_OPEN_TARGET = /\b(?:json\.dump|yaml\.(?:safe_dump|dump))\([\s\S]*?,\s*Path\(\s*(['"])(?<path>[^'"]+)\1\s*\)\.open\(\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)/g;
const PYTHON_FLAT_LITERAL_COLLECTION = String.raw`(?<payload>\{[^\n{}\[\]]*\}|\[[^\n{}\[\]]*\])`;
const PYTHON_DUMP_LITERAL_OPEN_TARGET = new RegExp(String.raw`\b(?<serializer>json\.dump|yaml\.(?:safe_dump|dump))\(\s*${PYTHON_FLAT_LITERAL_COLLECTION}\s*,\s*open\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*,\s*(?<modeQuote>['"])(?<mode>[^'"]*)\k<modeQuote>[\s\S]*?\)\s*(?:,[^\n)]*)?\)`, 'g');
const PYTHON_DUMP_LITERAL_PATH_OPEN_TARGET = new RegExp(String.raw`\b(?<serializer>json\.dump|yaml\.(?:safe_dump|dump))\(\s*${PYTHON_FLAT_LITERAL_COLLECTION}\s*,\s*Path\(\s*(?<pathQuote>['"])(?<path>[^'"]+)\k<pathQuote>\s*\)\.open\(\s*(?<modeQuote>['"])(?<mode>[^'"]*)\k<modeQuote>[\s\S]*?\)\s*(?:,[^\n)]*)?\)`, 'g');

export function pythonContentBindings(command: string): ReadonlyMap<string, string> {
  return contentBindingsFromPatterns(command, [PYTHON_TRIPLE_CONTENT_BINDING]);
}

type BoundScriptTarget = {
  readonly name: string;
  readonly path: string;
};

type BoundScriptWriteEvidenceInput = ScriptWriteEvidenceContext & {
  readonly command: string;
  readonly targets: readonly BoundScriptTarget[];
  readonly contentBindings: ReadonlyMap<string, string>;
};

function mergeChangedEvidence(files: Map<string, FileEvidence>, path: string): void {
  if (!files.has(path)) files.set(path, { path, status: 'modified' });
}

function literalCollectionItemCount(payload: string): number {
  const inner = payload.slice(1, -1).trim();
  if (!inner) return 0;
  let items = 1;
  let quote: string | null = null;
  let escaped = false;
  for (const char of inner) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ',') items += 1;
  }
  return items;
}

function literalDumpLineCount(serializer: string, payload: string, call: string): number | null {
  const items = literalCollectionItemCount(payload);
  if (serializer === 'json.dump') return /,\s*indent\s*=/.test(call) ? items + 2 : 1;
  if (/,\s*default_flow_style\s*=\s*True\b/.test(call)) return null;
  return Math.max(items, 1);
}

function pythonBoundTargets(command: string): BoundScriptTarget[] {
  const targets: BoundScriptTarget[] = [];
  PYTHON_PATH_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_PATH_BINDING_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) targets.push({ name, path });
  }

  PYTHON_OPEN_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_OPEN_BINDING_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    const mode = match.groups?.mode ?? '';
    if (name && path && /[wax+]/.test(mode)) targets.push({ name, path });
  }
  return targets;
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
    const literalDumpPattern = new RegExp(`\\b(?<serializer>json\\.dump|yaml\\.(?:safe_dump|dump))\\(\\s*${PYTHON_FLAT_LITERAL_COLLECTION}\\s*,\\s*${escapeRegExp(target.name)}\\s*(?:,[^\\n)]*)?\\)`, 'g');
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
    const variablePattern = new RegExp(`\\b${escapeRegExp(target.name)}\\.write(?:_text)?\\(\\s*(?<contentName>[A-Za-z_]\\w*)\\s*(?:,[^\\n)]*)?\\)`, 'g');
    for (const match of input.command.matchAll(variablePattern)) {
      const contentName = match.groups?.contentName;
      const content = contentName ? input.contentBindings.get(contentName) : undefined;
      if (content === undefined) continue;
      mergeAddedEvidence(files, path, countTextLines(unescapeScriptText(content)));
    }
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
    ...variableContentWriteEvidence({ ...context, pattern: PYTHON_CONTENT_VARIABLE_WRITE_TARGET, command, contentBindings }),
    ...pythonDumpTargetEvidence(context, command),
    ...boundScriptWriteEvidence({ ...context, command, targets: pythonBoundTargets(command), contentBindings })
  ];
}
