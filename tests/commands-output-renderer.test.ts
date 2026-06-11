import { describe, expect, it } from 'vitest';
import type { CommandCatalog } from '../src/cli/command-catalog.js';
import { buildCommandsJsonPayload, renderCommandsHumanLines } from '../src/cli/commands-output-renderer.js';

const catalog: CommandCatalog = {
  entryFor: (definition) => ({
    name: definition.name,
    description: definition.description,
    usage: definition.usage ?? `agentfeed ${definition.name} [options]`,
    help_command: `agentfeed help ${definition.name}`,
    example_command: definition.exampleCommand,
    options: {
      flags: [],
      value_options: [],
      option_details: [],
      conflicts: [],
      completion_words: []
    }
  })
};

describe('commands output renderer', () => {
  it('builds the commands JSON payload from command metadata', () => {
    // Given: command metadata, workflows, next actions, and a catalog entry builder.
    const payload = buildCommandsJsonPayload({
      nextActions: ['agentfeed init', 'agentfeed login'],
      workflows: [
        { name: 'Setup', description: 'Connect once.', commands: ['agentfeed init'] }
      ],
      groups: [
        { title: 'Start', commands: ['init', 'completion'] }
      ],
      descriptions: {
        init: 'Initialize project',
        completion: 'Print shell completion script'
      },
      examples: {
        init: 'agentfeed init',
        completion: 'agentfeed completion zsh'
      },
      usageOverrides: {
        completion: 'agentfeed completion <shell>'
      },
      catalog
    });

    // Then: group order, next actions, workflows, examples, and explicit usage are preserved.
    expect(payload).toEqual({
      next_actions: ['agentfeed init', 'agentfeed login'],
      workflows: [
        { name: 'Setup', description: 'Connect once.', commands: ['agentfeed init'] }
      ],
      commands: [
        {
          group: 'Start',
          commands: [
            {
              name: 'init',
              description: 'Initialize project',
              usage: 'agentfeed init [options]',
              help_command: 'agentfeed help init',
              example_command: 'agentfeed init',
              options: { flags: [], value_options: [], option_details: [], conflicts: [], completion_words: [] }
            },
            {
              name: 'completion',
              description: 'Print shell completion script',
              usage: 'agentfeed completion <shell>',
              help_command: 'agentfeed help completion',
              example_command: 'agentfeed completion zsh',
              options: { flags: [], value_options: [], option_details: [], conflicts: [], completion_words: [] }
            }
          ]
        }
      ]
    });
  });

  it('renders human commands output around injected catalog, workflow, and next-action lines', () => {
    // Given: pre-rendered sections and display formatters.
    const lines = renderCommandsHumanLines({
      heading: (value) => `[${value}]`,
      section: (value) => `{${value}}`,
      command: (value) => `<${value}>`,
      commandCatalogLines: ['\n{Commands}:', '  Start:'],
      workflowLines: ['\n{Guided workflows}:', '  Setup: Connect once.'],
      nextActionLines: ['Recommended order:', '  1. <agentfeed init>']
    });

    // Then: the command surface order stays stable while sections remain injectable.
    expect(lines).toEqual([
      '[AgentFeed commands]',
      '\n{Commands}:',
      '  Start:',
      '\n{Guided workflows}:',
      '  Setup: Connect once.',
      '\n{Try this}:',
      'Recommended order:',
      '  1. <agentfeed init>',
      '\nRun <agentfeed help <command>> for command-specific options.'
    ]);
  });
});
