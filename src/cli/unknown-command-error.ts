import { unknownCommandErrorMessage } from './command-recovery.js';

export interface UnknownCommandErrorInput {
  readonly command: string;
  readonly knownCommands: readonly string[];
}

export function unknownCommandError(input: UnknownCommandErrorInput): Error {
  return new Error(unknownCommandErrorMessage(input.command, input.knownCommands));
}
