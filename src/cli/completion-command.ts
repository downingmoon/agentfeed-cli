import { unsupportedCompletionShellMessage } from './command-recovery.js';

export type CompletionCommandResult =
  | { readonly kind: 'help'; readonly command: 'completion' }
  | { readonly kind: 'script'; readonly script: string };

export type CompletionCommandInput = {
  readonly args: readonly string[];
  readonly scriptFor: (shell: string) => string | undefined;
  readonly supportedShells: readonly string[];
};

export function completionCommandResult(input: CompletionCommandInput): CompletionCommandResult {
  const shell = input.args[0];
  if (shell === undefined) return { kind: 'help', command: 'completion' };
  const script = input.scriptFor(shell);
  if (script !== undefined) return { kind: 'script', script };
  throw new Error(unsupportedCompletionShellMessage(shell, input.supportedShells));
}

export function unexpectedCompletionCommandResult(result: never): never {
  throw new Error(`Unexpected completion command result: ${JSON.stringify(result)}`);
}
