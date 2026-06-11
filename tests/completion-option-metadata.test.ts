import { describe, expect, it } from 'vitest';
import { createCompletionOptionMetadata } from '../src/cli/completion-option-metadata.js';

describe('createCompletionOptionMetadata', () => {
  it('describes option metadata without changing command-specific completion contracts', () => {
    // Given: command specs with value options and source choices.
    const metadata = createCompletionOptionMetadata({
      commandSpecs: {
        login: { flags: ['--json'], valueOptions: ['--api-base-url'] },
        collect: { valueOptions: ['--source', '--path'] }
      },
      valueChoices: {
        '--source': ['codex', 'claude-code'],
        '--token': ['-']
      }
    });

    // When / Then: command overrides, value requirements, hints, choices, and file options are stable.
    expect(metadata.descriptionFor('login', '--json')).toBe('Print machine-readable login status');
    expect(metadata.descriptionFor('collect', '--source')).toBe('Select agent source');
    expect(metadata.descriptionFor('unknown', '--missing')).toBe('Option for agentfeed unknown');
    expect(metadata.requiresValue('login', '--api-base-url')).toBe(true);
    expect(metadata.requiresValue('login', '--json')).toBe(false);
    expect(metadata.valuePlaceholderFor('--api-base-url')).toBe('API URL');
    expect(metadata.valuePlaceholderFor('--missing')).toBe('value');
    expect(metadata.valueChoicesFor('--source')).toEqual(['codex', 'claude-code']);
    expect(metadata.valueChoicesFor('--missing')).toEqual([]);
    expect(metadata.isFileValueOption('--path')).toBe(true);
    expect(metadata.isFileValueOption('--source')).toBe(false);
  });
});
