import { CORE_COMMAND_HELP_TEXT } from './command-help-core-text.js';
import { WORKFLOW_COMMAND_HELP_TEXT } from './command-help-workflow-text.js';

const COMMAND_HELP_TEXT: Readonly<Record<string, string>> = {
  ...CORE_COMMAND_HELP_TEXT,
  ...WORKFLOW_COMMAND_HELP_TEXT
};

export function commandHelpText(command: string): string {
  const text = COMMAND_HELP_TEXT[command];
  if (!text) throw new Error(`Unknown command: ${command}`);
  return text;
}
