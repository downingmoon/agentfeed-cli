import { initProject as defaultInitProject } from '../config/project-config.js';
import { flag, option } from './args.js';
import { initJsonPayload, renderInitHumanLines } from './init-output.js';

type Print = (text?: string) => void;
type PrintLines = (lines: readonly string[]) => void;
type InitProject = typeof defaultInitProject;

export type InitCliCommandDependencies = {
  readonly initProject?: InitProject;
};

export type InitCliCommandIo = {
  readonly cwd: string;
  readonly print: Print;
  readonly printLines: PrintLines;
  readonly dependencies?: InitCliCommandDependencies;
};

export async function runInitCliCommand(args: string[], io: InitCliCommandIo): Promise<void> {
  const initProject = io.dependencies?.initProject ?? defaultInitProject;
  const result = await initProject({
    cwd: io.cwd,
    projectName: option(args, '--project-name'),
    noGitCheck: flag(args, '--no-git-check'),
    force: flag(args, '--force')
  });
  const initOutput = {
    alreadyInitialized: result.alreadyInitialized,
    project: {
      name: result.config.project.name,
      visibility: result.config.project.visibility,
      tags: result.config.project.tags
    },
    root: result.root,
    backupPaths: result.backupPaths
  };
  if (flag(args, '--json')) {
    io.print(JSON.stringify(initJsonPayload(initOutput), null, 2));
    return;
  }
  io.printLines(renderInitHumanLines(initOutput));
}
