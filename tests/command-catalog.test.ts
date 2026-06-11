import { describe, expect, it } from 'vitest';
import { createCommandCatalog } from '../src/cli/command-catalog.js';

describe('createCommandCatalog', () => {
  it('builds command catalog entries with option details and completion words', () => {
    // Given: command specs, vocabulary, and metadata for a public command.
    const catalog = createCommandCatalog({
      commandSpecs: {
        share: {
          flags: ['--dry', '--json'],
          valueOptions: ['--source'],
          conflicts: [['--dry', '--json']]
        }
      },
      vocabulary: {
        optionsFor: () => ['--dry', '--json', '--source', '--help'],
        helpTopicWords: () => ['share', 'token'],
        wordsFor: () => ['--dry', '--json', '--source', '--help']
      },
      optionMetadata: {
        descriptionFor: (_command, optionName) => optionName === '--source' ? 'Select source' : 'Generic option',
        requiresValue: (_command, optionName) => optionName === '--source',
        valuePlaceholderFor: () => 'source',
        valueChoicesFor: (optionName) => optionName === '--source' ? ['codex'] : [],
        isFileValueOption: () => false
      }
    });

    // When: a command definition is rendered for the catalog.
    const entry = catalog.entryFor({
      name: 'share',
      description: 'Share work',
      exampleCommand: 'agentfeed share --dry'
    });

    // Then: the JSON-facing contract preserves usage, options, conflicts, and completion words.
    expect(entry).toEqual({
      name: 'share',
      description: 'Share work',
      usage: 'agentfeed share [options]',
      help_command: 'agentfeed help share',
      example_command: 'agentfeed share --dry',
      options: {
        flags: ['--dry', '--json'],
        value_options: ['--source'],
        option_details: [
          { name: '--dry', description: 'Generic option', requires_value: false },
          { name: '--json', description: 'Generic option', requires_value: false },
          { name: '--source', description: 'Select source', requires_value: true, value_hint: 'source', value_choices: ['codex'] },
          { name: '--help', description: 'Generic option', requires_value: false }
        ],
        conflicts: [['--dry', '--json']],
        completion_words: ['--dry', '--json', '--source', '--help']
      }
    });
  });

  it('uses explicit command usage when provided', () => {
    // Given: a command definition with non-option positional usage.
    const catalog = createCommandCatalog({
      commandSpecs: {},
      vocabulary: {
        optionsFor: () => ['--help'],
        helpTopicWords: () => [],
        wordsFor: () => ['zsh', 'bash', 'fish', '--help']
      },
      optionMetadata: {
        descriptionFor: () => 'Show command help',
        requiresValue: () => false,
        valuePlaceholderFor: () => 'value',
        valueChoicesFor: () => [],
        isFileValueOption: () => false
      }
    });

    // When / Then: usage overrides are owned by the command definition, not inferred from the name.
    expect(catalog.entryFor({
      name: 'completion',
      description: 'Print shell completion script',
      exampleCommand: 'agentfeed completion zsh',
      usage: 'agentfeed completion <shell>'
    }).usage).toBe('agentfeed completion <shell>');
  });
});
