import { describe, expect, it } from 'vitest';
import { commandHelpText } from '../src/cli/command-help-text.js';

describe('commandHelpText', () => {
  it('keeps token compatibility help separate from public rotate help', () => {
    // Given / When: help text is requested for the compatibility token alias.
    const text = commandHelpText('token');

    // Then: alias guidance and rotate options remain stable.
    expect(text).toContain('Usage: agentfeed token rotate [options]');
    expect(text).toContain('Compatibility alias for:');
    expect(text).toContain('agentfeed rotate');
    expect(text).toContain('--api-base-url <url>');
  });

  it('keeps share and completion help content available through the shared facade', () => {
    // Given / When: workflow and shell-completion command help text is requested.
    const share = commandHelpText('share');
    const completion = commandHelpText('completion');

    // Then: important enterprise workflow guidance remains present.
    expect(share).toContain('Usage: agentfeed share [options]');
    expect(share).toContain('--note <text>');
    expect(share).toContain('agentfeed share --yes --open-review');
    expect(completion).toContain('Supported shells: zsh, bash, fish');
    expect(completion).toContain('agentfeed completion zsh > ~/.zsh/completions/_agentfeed');
  });

  it('keeps unknown help topics rejected by the help text boundary', () => {
    // Given / When / Then: unknown command help stays an explicit error.
    expect(() => commandHelpText('statsu')).toThrow('Unknown command: statsu');
  });
});
