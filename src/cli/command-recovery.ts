import { closestMatch } from './closest-match.js';

export function commandHelpHint(command: string): string {
  if (command === 'token') return 'Run: agentfeed token rotate --help';
  if (command === 'help') return 'Run: agentfeed help --help';
  return `Run: agentfeed ${command} --help`;
}

export function commandUsageError(message: string, command: string, suggestions: readonly string[] = []): string {
  return [
    message,
    ...suggestions,
    commandHelpHint(command)
  ].join('\n');
}

export function conflictingOptionsError(command: string, first: string, second: string): string {
  return [
    `Conflicting options for ${command}: ${first} and ${second}`,
    `Use only one of ${first} or ${second}.`,
    commandHelpHint(command)
  ].join('\n');
}

export function conflictingOptionsMessage(
  command: string,
  seenOptions: ReadonlySet<string>,
  conflicts: readonly (readonly [string, string])[]
): string | null {
  for (const [first, second] of conflicts) {
    if (seenOptions.has(first) && seenOptions.has(second)) return conflictingOptionsError(command, first, second);
  }
  return null;
}

export function bareDoubleDashArgumentMessage(command: string): string {
  return commandUsageError(`Unexpected argument for ${command}: --`, command);
}

export function optionRequiresValueMessage(command: string, optionName: string): string {
  return commandUsageError(`${optionName} requires a value.`, command);
}

export function optionDoesNotAcceptValueMessage(command: string, optionName: string): string {
  return commandUsageError(`${optionName} does not accept a value.`, command);
}

export function helpTopicError(topic: string, publicCommands: readonly string[]): string {
  const suggestion = closestMatch(topic, publicCommands);
  return [
    `Unknown help topic: ${topic}`,
    ...(suggestion ? [`Did you mean: agentfeed help ${suggestion}`] : []),
    'Run: agentfeed help'
  ].join('\n');
}

export function helpUnexpectedArgumentMessage(argument: string): string {
  return commandUsageError(`Unexpected argument for help: ${argument}`, 'help');
}

export function helpUnexpectedTokenArgumentMessage(argument: string): string {
  return commandUsageError(`Unexpected argument for help token: ${argument}`, 'help');
}

export function tokenUsageMessage(): string {
  return commandUsageError('Usage: agentfeed token rotate', 'token');
}

export function unknownTokenSubcommandMessage(subcommand: string): string {
  return commandUsageError(`Unknown token subcommand: ${subcommand}`, 'token');
}

export function tokenRotateUnexpectedArgumentMessage(argument: string, suggestions: readonly string[] = []): string {
  return commandUsageError(`Unexpected argument for token rotate: ${argument}`, 'token', suggestions);
}

export function unknownCommandErrorMessage(command: string, publicCommands: readonly string[]): string {
  const suggestion = closestMatch(command, publicCommands);
  return [
    `Unknown command: ${command}`,
    ...(suggestion ? [`Did you mean: agentfeed ${suggestion}`] : []),
    'Run: agentfeed --help'
  ].join('\n');
}

export function unknownOptionErrorMessage(command: string, optionName: string, candidates: readonly string[]): string {
  const suggestion = closestMatch(optionName, candidates);
  return [
    `Unknown option: ${optionName}`,
    `Command: agentfeed ${command}`,
    ...(suggestion ? [`Did you mean: ${suggestion}`] : []),
    commandHelpHint(command)
  ].join('\n');
}

export function unknownCommandOptionMessage(
  command: string,
  optionName: string,
  flags: readonly string[],
  valueOptions: readonly string[]
): string {
  return unknownOptionErrorMessage(command, optionName, [...flags, ...valueOptions, '--help', '-h']);
}

export function unsupportedCompletionShellMessage(shell: string, supportedShells: readonly string[]): string {
  const suggestion = closestMatch(shell, supportedShells);
  return [
    `Unsupported completion shell: ${shell}`,
    `Supported shells: ${supportedShells.join(', ')}`,
    ...(suggestion ? [`Did you mean: agentfeed completion ${suggestion}`] : []),
    'Run: agentfeed completion --help'
  ].join('\n');
}

export function completionUnexpectedArgumentMessage(argument: string): string {
  return commandUsageError(`Unexpected argument for completion: ${argument}`, 'completion');
}

function flaglessOptionCommandSuggestion(
  command: string,
  positionals: readonly string[],
  flags: readonly string[],
  prefixPositionals: readonly string[] = []
): string | null {
  if (positionals.length === 0) return null;
  const flagByBareName = new Map(
    flags
      .filter((candidate) => candidate.startsWith('--'))
      .map((candidate) => [candidate.slice(2), candidate])
  );
  const suggestedFlags: string[] = [];
  for (const positional of positionals) {
    const flag = flagByBareName.get(positional);
    if (!flag) return null;
    suggestedFlags.push(flag);
  }
  return `agentfeed ${[command, ...prefixPositionals, ...suggestedFlags].join(' ')}`;
}

export function flaglessOptionSuggestionLines(
  command: string,
  positionals: readonly string[],
  flags: readonly string[],
  prefixPositionals: readonly string[] = []
): string[] {
  const suggestion = flaglessOptionCommandSuggestion(command, positionals, flags, prefixPositionals);
  return suggestion ? [`Did you mean: ${suggestion}`] : [];
}
