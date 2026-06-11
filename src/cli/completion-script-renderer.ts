import type { CompletionOptionMetadata } from './completion-option-metadata.js';
import type { CompletionVocabulary } from './completion-vocabulary.js';

export type CompletionScriptCommand = {
  readonly name: string;
  readonly description: string;
};

export type CompletionScriptRendererInput = {
  readonly commands: readonly CompletionScriptCommand[];
  readonly sourceValues: readonly string[];
  readonly vocabulary: CompletionVocabulary;
  readonly optionMetadata: CompletionOptionMetadata;
};

export type CompletionScriptRenderer = {
  readonly scriptFor: (shell: string) => string | undefined;
};

function fishQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function zshQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function createCompletionScriptRenderer(input: CompletionScriptRendererInput): CompletionScriptRenderer {
  const commandNames = (): readonly string[] => input.commands.map((command) => command.name);

  const zshOptionArgument = (command: string, optionName: string): string => {
    const description = input.optionMetadata.descriptionFor(command, optionName).replace(/]/g, '\\]');
    const base = `${optionName}[${description}]`;
    if (!input.optionMetadata.requiresValue(command, optionName)) return base;
    const placeholder = input.optionMetadata.valuePlaceholderFor(optionName);
    const choices = input.optionMetadata.valueChoicesFor(optionName);
    if (choices.length) return `${base}:${placeholder}:(${choices.join(' ')})`;
    if (input.optionMetadata.isFileValueOption(optionName)) return `${base}:${placeholder}:_files`;
    return `${base}:${placeholder}:`;
  };

  const zshArgumentsCase = (command: string): string => {
    if (command === 'completion' || command === 'help') {
      return `    ${command}) compadd -- ${input.vocabulary.wordsFor(command).join(' ')} ;;`;
    }
    const options = input.vocabulary.optionsFor(command);
    const entries = options
      .map((optionName, index) => {
        const suffix = index === options.length - 1 ? '' : ' \\';
        return `        ${zshQuote(zshOptionArgument(command, optionName))}${suffix}`;
      })
      .join('\n');
    return [
      `    ${command})`,
      '      _arguments \\',
      entries,
      '      ;;'
    ].join('\n');
  };

  const zshCompletionScript = (): string => {
    const commandEntries = input.commands
      .map((command) => `    '${command.name}:${command.description}'`)
      .join('\n');
    const optionCases = commandNames()
      .map((command) => zshArgumentsCase(command))
      .join('\n');
    return `#compdef agentfeed

_agentfeed() {
  local -a commands
  commands=(
${commandEntries}
  )

  if (( CURRENT == 2 )); then
    _describe 'agentfeed command' commands
    return
  fi

  case "$words[2]" in
${optionCases}
    *) compadd -- --help ;;
  esac
}

_agentfeed "$@"
`;
  };

  const bashCompletionScript = (): string => {
    const commands = commandNames().join(' ');
    const optionCases = commandNames()
      .map((command) => `    ${command}) options="${input.vocabulary.wordsFor(command).join(' ')}" ;;`)
      .join('\n');
    const sourceValues = input.sourceValues.join(' ');
    return `_agentfeed() {
  local cur prev command commands options
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  command="\${COMP_WORDS[1]}"
  commands="${commands}"

  if [[ COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return 0
  fi

  case "$prev" in
    --source) COMPREPLY=( $(compgen -W "${sourceValues}" -- "$cur") ); return 0 ;;
    --token) COMPREPLY=( $(compgen -W "-" -- "$cur") ); return 0 ;;
    --path|--session-file|--settings-path) COMPREPLY=( $(compgen -f -- "$cur") ); return 0 ;;
  esac

  case "$command" in
${optionCases}
    *) options="--help" ;;
  esac

  COMPREPLY=( $(compgen -W "$options" -- "$cur") )
}

complete -F _agentfeed agentfeed
`;
  };

  const fishOptionLines = (command: string): readonly string[] => {
    return input.vocabulary.optionsFor(command).map((optionName) => {
      const description = fishQuote(input.optionMetadata.descriptionFor(command, optionName));
      const choices = input.optionMetadata.valueChoicesFor(optionName);
      const valueHint = input.optionMetadata.requiresValue(command, optionName) ? ' -r' : '';
      const choiceHint = choices.length ? ` -a ${fishQuote(choices.join(' '))}` : '';
      const fileHint = input.optionMetadata.isFileValueOption(optionName) ? ' -F' : '';
      if (optionName.startsWith('--')) {
        return `complete -c agentfeed -n "__fish_seen_subcommand_from ${command}" -l ${optionName.slice(2)}${valueHint}${choiceHint}${fileHint} -d ${description}`;
      }
      if (optionName.startsWith('-') && optionName.length === 2) {
        return `complete -c agentfeed -n "__fish_seen_subcommand_from ${command}" -s ${optionName.slice(1)}${valueHint}${choiceHint}${fileHint} -d ${description}`;
      }
      return '';
    }).filter((line) => line.length > 0);
  };

  const fishCompletionScript = (): string => {
    const commandList = commandNames().join(' ');
    const helpTopics = input.vocabulary.helpTopicWords().join(' ');
    const lines = [
      'complete -c agentfeed -f',
      ...input.commands.map((command) => `complete -c agentfeed -n "not __fish_seen_subcommand_from ${commandList}" -a "${command.name}" -d "${command.description}"`),
      'complete -c agentfeed -n "__fish_seen_subcommand_from completion" -a "zsh bash fish" -d "Completion shell"',
      `complete -c agentfeed -n "__fish_seen_subcommand_from help" -a "${helpTopics}" -d "Help topic"`,
      ...commandNames().flatMap((command) => fishOptionLines(command))
    ];
    return `${lines.join('\n')}\n`;
  };

  const scriptFor = (shell: string): string | undefined => {
    switch (shell) {
      case 'zsh':
        return zshCompletionScript();
      case 'bash':
        return bashCompletionScript();
      case 'fish':
        return fishCompletionScript();
      default:
        return undefined;
    }
  };

  return { scriptFor };
}
