export type BoundScriptTarget = {
  readonly name: string;
  readonly path: string;
};

const PYTHON_STRING_PATH_BINDING_TARGET = /\b(?<name>[A-Za-z_]\w*)\s*=\s*(['"])(?<path>[^'"]+)\2/g;
const PYTHON_PATH_BINDING_TARGET = /\b(?<name>[A-Za-z_]\w*)\s*=\s*Path\(\s*(['"])(?<path>[^'"]+)\2\s*\)/g;
const PYTHON_PATH_DIVISION_BINDING_TARGET = /\b(?<name>[A-Za-z_]\w*)\s*=\s*(?<baseName>[A-Za-z_]\w*)(?<segments>(?:\s*\/\s*(['"])[^'"]+\4)+)/g;
const PYTHON_PATH_DIVISION_SEGMENT = /\s*\/\s*(['"])(?<segment>[^'"]+)\1/g;
const PYTHON_OPEN_BINDING_TARGET = /\bwith\s+open\(\s*(['"])(?<path>[^'"]+)\1\s*,\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)\s+as\s+(?<name>[A-Za-z_]\w*)\s*:/g;
const PYTHON_PATH_OPEN_BINDING_TARGET = /\bwith\s+Path\(\s*(['"])(?<path>[^'"]+)\1\s*\)\.open\(\s*(['"])(?<mode>[^'"]*)\3[\s\S]*?\)\s+as\s+(?<name>[A-Za-z_]\w*)\s*:/g;
const PYTHON_OPEN_PATH_VARIABLE_BINDING_TARGET = /\bwith\s+open\(\s*(?<pathName>[A-Za-z_]\w*)\s*,\s*(['"])(?<mode>[^'"]*)\2[\s\S]*?\)\s+as\s+(?<name>[A-Za-z_]\w*)\s*:/g;
const PYTHON_PATH_VARIABLE_OPEN_BINDING_TARGET = /\bwith\s+(?<pathName>[A-Za-z_]\w*)\.open\(\s*(['"])(?<mode>[^'"]*)\2[\s\S]*?\)\s+as\s+(?<name>[A-Za-z_]\w*)\s*:/g;

export function pythonStringPathTargets(command: string): BoundScriptTarget[] {
  const targets: BoundScriptTarget[] = [];
  PYTHON_STRING_PATH_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_STRING_PATH_BINDING_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) targets.push({ name, path });
  }
  return targets;
}

function literalPathDivision(basePath: string, rawSegments: string): string | null {
  const segments: string[] = [];
  let cursor = 0;
  PYTHON_PATH_DIVISION_SEGMENT.lastIndex = 0;
  for (const match of rawSegments.matchAll(PYTHON_PATH_DIVISION_SEGMENT)) {
    if (match.index !== cursor) return null;
    const segment = match.groups?.segment;
    if (!segment || segment.includes('${')) return null;
    segments.push(segment);
    cursor = match.index + match[0].length;
  }
  if (!segments.length || rawSegments.slice(cursor).trim()) return null;
  return [basePath, ...segments].join('/').replace(/\/+/g, '/');
}

export function pythonBoundTargets(command: string): BoundScriptTarget[] {
  const targets: BoundScriptTarget[] = [];
  const pathByName = new Map(pythonStringPathTargets(command).map((target) => [target.name, target.path]));
  PYTHON_PATH_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_PATH_BINDING_TARGET)) {
    const name = match.groups?.name;
    const path = match.groups?.path;
    if (name && path) {
      targets.push({ name, path });
      pathByName.set(name, path);
    }
  }
  PYTHON_PATH_DIVISION_BINDING_TARGET.lastIndex = 0;
  for (const match of command.matchAll(PYTHON_PATH_DIVISION_BINDING_TARGET)) {
    const name = match.groups?.name;
    const basePath = match.groups?.baseName ? pathByName.get(match.groups.baseName) : undefined;
    const path = basePath ? literalPathDivision(basePath, match.groups?.segments ?? '') : null;
    if (name && path) {
      targets.push({ name, path });
      pathByName.set(name, path);
    }
  }

  for (const pattern of [PYTHON_OPEN_BINDING_TARGET, PYTHON_PATH_OPEN_BINDING_TARGET]) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const name = match.groups?.name;
      const path = match.groups?.path;
      const mode = match.groups?.mode ?? '';
      if (name && path && /[wax+]/.test(mode)) targets.push({ name, path });
    }
  }
  for (const pattern of [PYTHON_OPEN_PATH_VARIABLE_BINDING_TARGET, PYTHON_PATH_VARIABLE_OPEN_BINDING_TARGET]) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const name = match.groups?.name;
      const pathName = match.groups?.pathName;
      const path = pathName ? pathByName.get(pathName) : undefined;
      const mode = match.groups?.mode ?? '';
      if (name && path && /[wax+]/.test(mode)) targets.push({ name, path });
    }
  }
  return targets;
}
