import { join } from 'node:path';
import { loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { pathExists } from '../utils/fs.js';
import type { AgentFeedProjectConfig } from '../types.js';

export type StatusProjectResolution = {
  readonly root: string;
  readonly config: AgentFeedProjectConfig | null;
  readonly configError: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function resolveStatusProject(cwd: string): Promise<StatusProjectResolution> {
  const root = await resolveProjectRoot(cwd);
  try {
    return { root, config: await loadProjectConfig(root), configError: null };
  } catch (error) {
    const agentfeedDirExists = await pathExists(join(root, '.agentfeed'));
    return {
      root,
      config: null,
      configError: agentfeedDirExists ? errorMessage(error) : null,
    };
  }
}
