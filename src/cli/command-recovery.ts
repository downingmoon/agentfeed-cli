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
