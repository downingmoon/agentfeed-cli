import { AGENTFEED_CLI_VERSION } from '../version.js';
import { flag } from './args.js';
import { COMMAND_ARG_SPECS, SUPPORTED_COMPLETION_SHELLS } from './command-arg-specs.js';
import { createCommandCatalog } from './command-catalog.js';
import { COMMAND_WORKFLOWS, renderCommandCatalogLines, renderCommandWorkflowLines } from './command-catalog-renderer.js';
import { completionCommandResult, unexpectedCompletionCommandResult } from './completion-command.js';
import { createCompletionOptionMetadata } from './completion-option-metadata.js';
import { createCompletionScriptRenderer } from './completion-script-renderer.js';
import { createCompletionVocabulary } from './completion-vocabulary.js';
import { COMMAND_DESCRIPTIONS, COMMAND_EXAMPLES, COMMAND_GROUPS, COMMAND_USAGE_OVERRIDES, PUBLIC_COMMANDS } from './command-definitions.js';
import { commandHelpText } from './command-help-text.js';
import { buildCommandsJsonPayload, renderCommandsHumanLines } from './commands-output-renderer.js';
import { commandCatalogNextActions } from './guidance-actions.js';
import { renderGuidedNextCommandLines } from './guided-next-command-renderer.js';
import { renderRootHelpLines } from './root-help-renderer.js';
import { SUPPORTED_SOURCES } from './source.js';
import * as ui from './ui.js';

interface CommandSurfaceIo {
  readonly print: (text?: string) => void;
}

const COMPLETION_VOCABULARY = createCompletionVocabulary({
  commandSpecs: COMMAND_ARG_SPECS,
  publicCommands: PUBLIC_COMMANDS,
  completionShells: SUPPORTED_COMPLETION_SHELLS
});
const COMPLETION_OPTION_METADATA = createCompletionOptionMetadata({
  commandSpecs: COMMAND_ARG_SPECS,
  valueChoices: {
    '--source': SUPPORTED_SOURCES,
    '--ai-worklog-tool': ['claude', 'codex', 'gemini', 'antigravity'],
    '--token': ['-']
  }
});
const COMPLETION_SCRIPT_RENDERER = createCompletionScriptRenderer({
  commands: PUBLIC_COMMANDS.map((command) => ({ name: command, description: COMMAND_DESCRIPTIONS[command] })),
  sourceValues: SUPPORTED_SOURCES,
  vocabulary: COMPLETION_VOCABULARY,
  optionMetadata: COMPLETION_OPTION_METADATA
});
const COMMAND_CATALOG = createCommandCatalog({
  commandSpecs: COMMAND_ARG_SPECS,
  vocabulary: COMPLETION_VOCABULARY,
  optionMetadata: COMPLETION_OPTION_METADATA
});

function commandCatalogLines(): string[] {
  return renderCommandCatalogLines({
    groups: COMMAND_GROUPS,
    descriptions: COMMAND_DESCRIPTIONS,
    section: ui.section,
    command: ui.command
  });
}

function commandWorkflowLines(): string[] {
  return renderCommandWorkflowLines({
    workflows: COMMAND_WORKFLOWS,
    section: ui.section,
    command: ui.command
  });
}

export async function runCompletionCommand(args: string[], io: CommandSurfaceIo): Promise<void> {
  const result = completionCommandResult({
    args,
    scriptFor: (shell) => COMPLETION_SCRIPT_RENDERER.scriptFor(shell),
    supportedShells: SUPPORTED_COMPLETION_SHELLS
  });
  switch (result.kind) {
    case 'help': return printCommandHelp(result.command, io);
    case 'script': return io.print(result.script);
    default: return unexpectedCompletionCommandResult(result);
  }
}

export async function runCommandsCommand(args: string[], io: CommandSurfaceIo): Promise<void> {
  const nextActions = commandCatalogNextActions();
  if (flag(args, '--json')) {
    io.print(JSON.stringify(buildCommandsJsonPayload({
      nextActions,
      workflows: COMMAND_WORKFLOWS,
      groups: COMMAND_GROUPS,
      descriptions: COMMAND_DESCRIPTIONS,
      examples: COMMAND_EXAMPLES,
      usageOverrides: COMMAND_USAGE_OVERRIDES,
      catalog: COMMAND_CATALOG
    }), null, 2));
    return;
  }
  for (const line of renderCommandsHumanLines({
    heading: ui.heading,
    section: ui.section,
    command: ui.command,
    commandCatalogLines: commandCatalogLines(),
    workflowLines: commandWorkflowLines(),
    nextActionLines: renderGuidedNextCommandLines({ commands: nextActions, command: ui.command })
  })) io.print(line);
}

export function printHelp(io: CommandSurfaceIo): void {
  for (const line of renderRootHelpLines({
    version: AGENTFEED_CLI_VERSION,
    heading: ui.heading,
    section: ui.section,
    command: ui.command,
    commandCatalogLines: commandCatalogLines()
  })) io.print(line);
}

export function printCommandHelp(command: string, io: CommandSurfaceIo): void {
  io.print(commandHelpText(command));
}

export function printHelpTopic(args: string[], io: CommandSurfaceIo): void {
  if (args.length === 0) {
    printHelp(io);
    return;
  }
  if (args[0] === 'token') {
    printCommandHelp('token', io);
    return;
  }
  printCommandHelp(args[0], io);
}
