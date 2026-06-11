import { describe, expect, it } from 'vitest';
import { createCompletionVocabulary } from '../src/cli/completion-vocabulary.js';

describe('createCompletionVocabulary', () => {
  it('builds sorted command options and contextual completion words', () => {
    // Given: command specs with flags, value options, and supported completion shells.
    const vocabulary = createCompletionVocabulary({
      commandSpecs: {
        status: { flags: ['--json'] },
        help: {},
        completion: {}
      },
      publicCommands: ['status', 'help'],
      completionShells: ['zsh', 'bash', 'fish']
    });

    // When / Then: options include --help, help includes topics, and completion includes shell names.
    expect(vocabulary.optionsFor('status')).toEqual(['--help', '--json']);
    expect(vocabulary.optionsFor('missing')).toEqual(['--help']);
    expect(vocabulary.helpTopicWords()).toEqual(['status', 'help', 'token']);
    expect(vocabulary.wordsFor('help')).toEqual(['status', 'help', 'token', '--help']);
    expect(vocabulary.wordsFor('completion')).toEqual(['zsh', 'bash', 'fish', '--help']);
  });
});
