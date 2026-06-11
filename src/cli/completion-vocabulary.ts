export type CompletionCommandSpec = {
  readonly flags?: readonly string[];
  readonly valueOptions?: readonly string[];
};

export type CompletionVocabularyInput = {
  readonly commandSpecs: Readonly<Record<string, CompletionCommandSpec | undefined>>;
  readonly publicCommands: readonly string[];
  readonly completionShells: readonly string[];
};

export type CompletionVocabulary = {
  readonly optionsFor: (command: string) => string[];
  readonly helpTopicWords: () => string[];
  readonly wordsFor: (command: string) => string[];
};

export function createCompletionVocabulary(input: CompletionVocabularyInput): CompletionVocabulary {
  const optionsFor = (command: string): string[] => {
    const spec = input.commandSpecs[command];
    if (!spec) return ['--help'];
    return [...new Set([...(spec.flags ?? []), ...(spec.valueOptions ?? []), '--help'])].sort();
  };

  const helpTopicWords = (): string[] => [...input.publicCommands, 'token'];

  const wordsFor = (command: string): string[] => {
    if (command === 'completion') return [...input.completionShells, ...optionsFor(command)];
    if (command === 'help') return [...helpTopicWords(), ...optionsFor(command)];
    return optionsFor(command);
  };

  return { optionsFor, helpTopicWords, wordsFor };
}
