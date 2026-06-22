import { deleteSavedCredentials as defaultDeleteSavedCredentials } from '../config/credentials.js';
import { flag } from './args.js';
import { logoutJsonPayload, renderLogoutHumanLines } from './logout-output.js';

type Print = (text?: string) => void;
type PrintLines = (lines: readonly string[]) => void;
type DeleteSavedCredentials = typeof defaultDeleteSavedCredentials;

export type LogoutCliCommandDependencies = {
  readonly deleteSavedCredentials?: DeleteSavedCredentials;
};

export type LogoutCliCommandIo = {
  readonly env: NodeJS.ProcessEnv;
  readonly print: Print;
  readonly printLines: PrintLines;
  readonly dependencies?: LogoutCliCommandDependencies;
};

export async function runLogoutCliCommand(args: string[], io: LogoutCliCommandIo): Promise<void> {
  const deleteSavedCredentials = io.dependencies?.deleteSavedCredentials ?? defaultDeleteSavedCredentials;
  const result = await deleteSavedCredentials();
  const logoutOutput = { result, envTokenActive: Boolean(io.env.AGENTFEED_TOKEN) };
  if (flag(args, '--json')) {
    io.print(JSON.stringify(logoutJsonPayload(logoutOutput), null, 2));
    return;
  }
  io.printLines(renderLogoutHumanLines(logoutOutput));
}
