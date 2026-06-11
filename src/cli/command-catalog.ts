import type { CompletionOptionMetadata } from './completion-option-metadata.js';
import type { CompletionCommandSpec, CompletionVocabulary } from './completion-vocabulary.js';

export type CommandCatalogSpec = CompletionCommandSpec & {
  readonly conflicts?: readonly (readonly [string, string])[];
};

export type CommandCatalogDefinition = {
  readonly name: string;
  readonly description: string;
  readonly exampleCommand: string;
  readonly usage?: string;
};

export type CommandOptionDetail = {
  readonly name: string;
  readonly description: string;
  readonly requires_value: boolean;
  readonly value_hint?: string;
  readonly value_choices?: readonly string[];
};

export type CommandCatalogEntry = {
  readonly name: string;
  readonly description: string;
  readonly usage: string;
  readonly help_command: string;
  readonly example_command: string;
  readonly options: {
    readonly flags: readonly string[];
    readonly value_options: readonly string[];
    readonly option_details: readonly CommandOptionDetail[];
    readonly conflicts: readonly (readonly [string, string])[];
    readonly completion_words: readonly string[];
  };
};

export type CommandCatalogInput = {
  readonly commandSpecs: Readonly<Record<string, CommandCatalogSpec | undefined>>;
  readonly vocabulary: CompletionVocabulary;
  readonly optionMetadata: CompletionOptionMetadata;
};

export type CommandCatalog = {
  readonly entryFor: (definition: CommandCatalogDefinition) => CommandCatalogEntry;
};

export function createCommandCatalog(input: CommandCatalogInput): CommandCatalog {
  const optionDetails = (command: string): readonly CommandOptionDetail[] => {
    return input.vocabulary.optionsFor(command).map((optionName) => {
      const requiresValue = input.optionMetadata.requiresValue(command, optionName);
      const choices = input.optionMetadata.valueChoicesFor(optionName);
      return {
        name: optionName,
        description: input.optionMetadata.descriptionFor(command, optionName),
        requires_value: requiresValue,
        ...(requiresValue ? { value_hint: input.optionMetadata.valuePlaceholderFor(optionName) } : {}),
        ...(choices.length ? { value_choices: [...choices] } : {})
      };
    });
  };

  const entryFor = (definition: CommandCatalogDefinition): CommandCatalogEntry => {
    const spec = input.commandSpecs[definition.name];
    return {
      name: definition.name,
      description: definition.description,
      usage: definition.usage ?? `agentfeed ${definition.name} [options]`,
      help_command: `agentfeed help ${definition.name}`,
      example_command: definition.exampleCommand,
      options: {
        flags: [...(spec?.flags ?? [])],
        value_options: [...(spec?.valueOptions ?? [])],
        option_details: optionDetails(definition.name),
        conflicts: [...(spec?.conflicts ?? [])].map(([first, second]) => [first, second]),
        completion_words: input.vocabulary.wordsFor(definition.name)
      }
    };
  };

  return { entryFor };
}
