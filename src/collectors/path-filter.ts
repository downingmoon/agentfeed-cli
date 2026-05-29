export const AGENT_METADATA_ROOTS = ['.agentfeed', '.claude', '.codex', '.cursor', '.gemini', '.omc', '.omx', '.ai', '.agent', '.agents', '.aider'];
const LOCAL_RUNTIME_DIR_NAMES = new Set(['.obsidian']);
const LOCAL_RUNTIME_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db']);

export function shouldIgnoreEvidencePath(path: string): boolean {
  const normalized = path.split('\\').join('/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  const basename = parts.at(-1);
  return AGENT_METADATA_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`))
    || parts.some((part) => LOCAL_RUNTIME_DIR_NAMES.has(part))
    || Boolean(basename && LOCAL_RUNTIME_FILE_NAMES.has(basename));
}
