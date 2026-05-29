export const AGENT_METADATA_ROOTS = ['.agentfeed', '.claude', '.codex', '.cursor', '.gemini', '.omc', '.omx', '.ai', '.agent', '.agents', '.aider'];

export function shouldIgnoreEvidencePath(path: string): boolean {
  const normalized = path.split('\\').join('/');
  return AGENT_METADATA_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}
