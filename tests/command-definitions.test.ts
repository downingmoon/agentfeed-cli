import { describe, expect, it } from 'vitest';
import { COMMAND_DESCRIPTIONS, COMMAND_EXAMPLES, COMMAND_GROUPS, COMMAND_USAGE_OVERRIDES, KNOWN_COMMANDS, PUBLIC_COMMANDS } from '../src/cli/command-definitions.js';

describe('command definitions', () => {
  it('keeps public commands ordered and grouped for help/catalog surfaces', () => {
    // Given / When: command definition metadata is shared by help, completion, and catalog output.
    const publicCommands = [...PUBLIC_COMMANDS];

    // Then: order, grouping, descriptions, examples, and usage overrides remain stable.
    expect(publicCommands).toEqual([
      'help', 'commands', 'init', 'login', 'share', 'collect', 'preview', 'publish', 'open',
      'scan', 'status', 'doctor', 'version', 'drafts', 'discard', 'rotate', 'logout', 'completion'
    ]);
    expect(COMMAND_GROUPS.map((group) => [group.title, [...group.commands]])).toEqual([
      ['Start', ['help', 'commands', 'init', 'login', 'status']],
      ['Share work', ['share', 'collect', 'preview', 'publish', 'open']],
      ['Privacy and drafts', ['scan', 'drafts', 'discard']],
      ['Shell integration', ['completion']],
      ['Account and diagnostics', ['doctor', 'version', 'rotate', 'logout']]
    ]);
    expect(COMMAND_DESCRIPTIONS.share).toBe('Collect, preview, and optionally upload in one workflow');
    expect(COMMAND_EXAMPLES.completion).toBe('agentfeed completion zsh');
    expect(COMMAND_USAGE_OVERRIDES.completion).toBe('agentfeed completion <shell>');
  });

  it('keeps compatibility commands known without making them public catalog entries', () => {
    // Given / When: token is a compatibility alias accepted by the parser.
    const publicCommands = [...PUBLIC_COMMANDS];

    // Then: token stays known for parsing/recovery, while retired hook surfaces stay absent.
    expect(publicCommands).not.toContain('token');
    expect(publicCommands).not.toContain('hook');
    expect(KNOWN_COMMANDS.has('token')).toBe(true);
    expect(KNOWN_COMMANDS.has('hook')).toBe(false);
    expect(KNOWN_COMMANDS.has('share')).toBe(true);
  });
});
