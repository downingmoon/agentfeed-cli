import { commandHelpHint } from './command-recovery.js';

export interface LeadingOptionCommandSpec {
  readonly flags?: readonly string[];
  readonly valueOptions?: readonly string[];
}

export interface LeadingOptionRecoveryInput {
  readonly option: string;
  readonly args: readonly string[];
  readonly knownCommands: ReadonlySet<string>;
  readonly commandSpecs: Readonly<Record<string, LeadingOptionCommandSpec | undefined>>;
}

function leadingOptionExamples(optionName: string, optionWithValue: string): readonly string[] {
  switch (optionName) {
    case '--dry':
    case '--dry-run':
      return [
        'Try: agentfeed share --dry',
        'Try: agentfeed collect --dry-run --explain'
      ];
    case '--json':
      return [
        'Try: agentfeed status --json',
        'Try: agentfeed commands --json'
      ];
    case '--api-base-url':
      return [`Try: agentfeed login ${optionWithValue}`];
    case '--source':
      return [`Try: agentfeed collect ${optionWithValue} --explain`];
    case '--session-file':
      return [`Try: agentfeed collect ${optionWithValue} --explain`];
    case '--token-stdin':
      return ['Try: printf %s "$TOKEN" | agentfeed login --token-stdin'];
    case '--no-open':
      return ['Try: agentfeed login --no-open'];
    case '--open-review':
      return ['Try: agentfeed share --yes --open-review'];
    default:
      return [];
  }
}

export function leadingOptionErrorMessage(input: LeadingOptionRecoveryInput): string {
  const optionName = input.option.includes('=') ? input.option.slice(0, input.option.indexOf('=')) : input.option;
  const commandIndex = input.args.findIndex((arg) => input.knownCommands.has(arg));
  const command = commandIndex >= 0 ? input.args[commandIndex] : null;
  const spec = command ? input.commandSpecs[command] : null;
  const acceptsOption = spec
    ? [...(spec.flags ?? []), ...(spec.valueOptions ?? []), '--help', '-h'].includes(optionName)
    : false;
  const valueTokens = commandIndex > 0 ? input.args.slice(0, commandIndex) : [];
  const valueSuffix = spec?.valueOptions?.includes(optionName) && !input.option.includes('=') && valueTokens[0] && !valueTokens[0].startsWith('-')
    ? ` ${valueTokens[0]}`
    : '';
  const reordered = command && acceptsOption
    ? `agentfeed ${command} ${input.option}${valueSuffix}`
    : null;
  const inlineValue = input.option.includes('=') ? input.option.slice(input.option.indexOf('=') + 1) : null;
  const nextValue = !input.option.includes('=') && input.args[0] && !input.args[0].startsWith('-') && !input.knownCommands.has(input.args[0])
    ? input.args[0]
    : null;
  const optionWithValue = inlineValue !== null || nextValue
    ? `${optionName} ${inlineValue ?? nextValue}`
    : optionName;
  return [
    `Option appears before command: ${optionName}`,
    'AgentFeed uses command-first syntax: agentfeed <command> [options].',
    ...(reordered ? [`Use: ${reordered}`] : leadingOptionExamples(optionName, optionWithValue)),
    ...(command ? [commandHelpHint(command)] : ['Run: agentfeed --help'])
  ].join('\n');
}
