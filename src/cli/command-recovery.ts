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

export function helpTopicError(topic: string, publicCommands: readonly string[]): string {
  const suggestion = closestMatch(topic, publicCommands);
  return [
    `Unknown help topic: ${topic}`,
    ...(suggestion ? [`Did you mean: agentfeed help ${suggestion}`] : []),
    'Run: agentfeed help'
  ].join('\n');
}

export function hookUsageMessage(): string {
  return [
    'Usage: agentfeed hook install|uninstall claude-code',
    'Run: agentfeed hook --help',
    'Run: agentfeed hook install claude-code --dry-run'
  ].join('\n');
}

export function unsupportedHookTargetMessage(action = 'install', target?: string): string {
  const suggestion = target && (target === 'claude' || target.startsWith('claude-'))
    ? `Did you mean: agentfeed hook ${action} claude-code`
    : null;
  return [
    'Only claude-code hooks are supported.',
    ...(suggestion ? [suggestion] : []),
    'Run: agentfeed hook install claude-code --help'
  ].join('\n');
}
