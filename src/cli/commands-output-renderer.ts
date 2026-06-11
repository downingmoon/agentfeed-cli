import type { CommandCatalog, CommandCatalogDefinition, CommandCatalogEntry } from './command-catalog.js';
import type { RenderCommandCatalogGroup, RenderCommandWorkflow, TextFormatter } from './command-catalog-renderer.js';

export type CommandsJsonGroup = {
  readonly group: string;
  readonly commands: readonly CommandCatalogEntry[];
};

export type CommandsJsonPayload = {
  readonly next_actions: readonly string[];
  readonly workflows: readonly RenderCommandWorkflow[];
  readonly commands: readonly CommandsJsonGroup[];
};

export type BuildCommandsJsonPayloadInput<CommandName extends string> = {
  readonly nextActions: readonly string[];
  readonly workflows: readonly RenderCommandWorkflow[];
  readonly groups: readonly RenderCommandCatalogGroup<CommandName>[];
  readonly descriptions: Readonly<Record<CommandName, string>>;
  readonly examples: Readonly<Record<CommandName, string>>;
  readonly usageOverrides: Readonly<Partial<Record<CommandName, string>>>;
  readonly catalog: CommandCatalog;
};

export type RenderCommandsHumanLinesInput = {
  readonly heading: TextFormatter;
  readonly section: TextFormatter;
  readonly command: TextFormatter;
  readonly commandCatalogLines: readonly string[];
  readonly workflowLines: readonly string[];
  readonly nextActionLines: readonly string[];
};

function commandDefinition<CommandName extends string>(
  input: BuildCommandsJsonPayloadInput<CommandName>,
  commandName: CommandName
): CommandCatalogDefinition {
  const usage = input.usageOverrides[commandName];
  return {
    name: commandName,
    description: input.descriptions[commandName],
    exampleCommand: input.examples[commandName],
    ...(usage === undefined ? {} : { usage })
  };
}

export function buildCommandsJsonPayload<CommandName extends string>(input: BuildCommandsJsonPayloadInput<CommandName>): CommandsJsonPayload {
  return {
    next_actions: input.nextActions,
    workflows: input.workflows,
    commands: input.groups.map((group) => ({
      group: group.title,
      commands: group.commands.map((commandName) => input.catalog.entryFor(commandDefinition(input, commandName)))
    }))
  };
}

export function renderCommandsHumanLines(input: RenderCommandsHumanLinesInput): string[] {
  return [
    input.heading('AgentFeed commands'),
    ...input.commandCatalogLines,
    ...input.workflowLines,
    `\n${input.section('Try this')}:`,
    ...input.nextActionLines,
    `\nRun ${input.command('agentfeed help <command>')} for command-specific options.`
  ];
}
