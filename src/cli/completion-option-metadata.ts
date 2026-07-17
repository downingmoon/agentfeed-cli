import type { CompletionCommandSpec } from './completion-vocabulary.js';

const COMPLETION_OPTION_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '--ai-worklog': 'Use a local AI CLI to improve worklog text',
  '--ai-worklog-tool': 'Select local AI CLI for worklog text',
  '--all': 'Collect from the full available local history',
  '--api-base-url': 'Override AgentFeed API base URL',
  '--browser': 'Allow browser authorization in guarded environments',
  '--clipboard': 'Copy the review URL to clipboard',
  '--dry': 'Collect or preview without uploading',
  '--dry-run': 'Collect or preview without uploading',
  '--explain': 'Show how local work was collected',
  '--force': 'Bypass the local draft reuse guard',
  '--help': 'Show command help',
  '-h': 'Show command help',
  '--id': 'Use a specific draft ID',
  '--json': 'Print machine-readable JSON output',
  '--latest': 'Use the newest local draft',
  '--no-clip': 'Do not copy the review URL',
  '--no-clipboard': 'Do not copy the review URL',
  '--no-git-check': 'Initialize even when no git repository is detected',
  '--no-open': 'Print the authorization URL instead of opening a browser',
  '--no-open-review': 'Do not open the private review URL',
  '--no-save': 'Do not persist credentials after login',
  '--no-save-cursor': 'Do not advance the collection cursor',
  '--no-ai-worklog': 'Skip local AI worklog improvement',
  '--no-upload': 'Keep the draft local instead of uploading',
  '--note': 'Attach a public-safe author note',
  '--open-review': 'Open the private review URL after upload',
  '--path': 'Scan a filesystem path',
  '--project-name': 'Set the AgentFeed project name',
  '--remote': 'Validate preview through the API',
  '--run-configured-commands': 'Run trusted configured test/build commands',
  '--session-file': 'Read agent session metadata from a file',
  '--since': 'Start the collection window',
  '--source': 'Select agent source',
  '--token': 'Read ingestion token from a value or stdin when value is -',
  '--token-stdin': 'Read ingestion token from stdin',
  '--until': 'End the collection window',
  '--upload': 'Upload after collecting',
  '--yes': 'Confirm the action without an interactive prompt',
  '-y': 'Confirm the action without an interactive prompt'
};

const COMMAND_COMPLETION_OPTION_DESCRIPTIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  commands: {
    '--json': 'Print a machine-readable command catalog'
  },
  login: {
    '--json': 'Print machine-readable login status',
    '--browser': 'Force browser authorization in guarded environments'
  },
  logout: {
    '--json': 'Print machine-readable logout status'
  },
  status: {
    '--json': 'Print machine-readable status diagnostics'
  },
  version: {
    '--json': 'Print the version as JSON'
  },
  collect: {
    '--json': 'Print machine-readable draft output',
    '--upload': 'Upload immediately after collecting'
  },
  share: {
    '--json': 'Print machine-readable share output',
    '--yes': 'Upload without an interactive confirmation',
    '-y': 'Upload without an interactive confirmation'
  },
  preview: {
    '--json': 'Print machine-readable draft preview'
  },
  publish: {
    '--json': 'Print machine-readable upload result',
    '--yes': 'Upload without an interactive confirmation',
    '-y': 'Upload without an interactive confirmation'
  },
  scan: {
    '--json': 'Print machine-readable privacy scan output'
  },
  doctor: {
    '--json': 'Print machine-readable diagnostic checks'
  },
  drafts: {
    '--json': 'Print machine-readable draft summaries'
  },
  discard: {
    '--json': 'Print machine-readable discard result'
  },
  open: {
    '--json': 'Print machine-readable review URL handoff'
  }
};

const COMPLETION_VALUE_PLACEHOLDERS: Readonly<Record<string, string>> = {
  '--ai-worklog-tool': 'tool',
  '--api-base-url': 'API URL',
  '--id': 'draft ID',
  '--note': 'note',
  '--path': 'path',
  '--project-name': 'project name',
  '--session-file': 'path',
  '--since': 'timestamp',
  '--source': 'source',
  '--token': 'token',
  '--until': 'timestamp'
};

const COMPLETION_FILE_VALUE_OPTIONS: readonly string[] = ['--path', '--session-file'];

export type CompletionOptionMetadataInput = {
  readonly commandSpecs: Readonly<Record<string, CompletionCommandSpec | undefined>>;
  readonly valueChoices: Readonly<Record<string, readonly string[] | undefined>>;
};

export type CompletionOptionMetadata = {
  readonly descriptionFor: (command: string, optionName: string) => string;
  readonly requiresValue: (command: string, optionName: string) => boolean;
  readonly valuePlaceholderFor: (optionName: string) => string;
  readonly valueChoicesFor: (optionName: string) => readonly string[];
  readonly isFileValueOption: (optionName: string) => boolean;
};

export function createCompletionOptionMetadata(input: CompletionOptionMetadataInput): CompletionOptionMetadata {
  const descriptionFor = (command: string, optionName: string): string => {
    return COMMAND_COMPLETION_OPTION_DESCRIPTIONS[command]?.[optionName]
      ?? COMPLETION_OPTION_DESCRIPTIONS[optionName]
      ?? `Option for agentfeed ${command}`;
  };

  const requiresValue = (command: string, optionName: string): boolean => {
    return input.commandSpecs[command]?.valueOptions?.includes(optionName) ?? false;
  };

  const valuePlaceholderFor = (optionName: string): string => {
    return COMPLETION_VALUE_PLACEHOLDERS[optionName] ?? 'value';
  };

  const valueChoicesFor = (optionName: string): readonly string[] => {
    return input.valueChoices[optionName] ?? [];
  };

  const isFileValueOption = (optionName: string): boolean => {
    return COMPLETION_FILE_VALUE_OPTIONS.includes(optionName);
  };

  return { descriptionFor, requiresValue, valuePlaceholderFor, valueChoicesFor, isFileValueOption };
}
