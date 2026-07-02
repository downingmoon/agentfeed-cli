import { resolve } from 'node:path';
import { relativeProjectPath } from './agent-session-core.js';

function normalizeShellToken(value: string): string {
  return value.trim().replace(/^[']|[']$/g, '').replace(/^["]|["]$/g, '');
}

export function projectRelativeShellPath(projectRoot: string, workdir: string | null, rawPath: string): string | null {
  const clean = normalizeShellToken(rawPath);
  if (!clean || clean.startsWith('&') || clean === '-') return null;
  if (clean.endsWith('/')) return null;
  if (/^\$|^~/.test(clean)) return null;
  return relativeProjectPath(projectRoot, resolve(workdir ?? projectRoot, clean));
}
