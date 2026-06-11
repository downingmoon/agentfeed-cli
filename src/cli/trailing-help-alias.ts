export interface TrailingHelpAliasInput {
  readonly command: string;
  readonly args: readonly string[];
}

export function isTrailingHelpAlias(input: TrailingHelpAliasInput): boolean {
  if (input.args.length === 1 && input.args[0] === 'help') return true;
  return input.command === 'token' && input.args.length === 2 && input.args[0] === 'rotate' && input.args[1] === 'help';
}
