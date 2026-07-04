export const PUBLIC_COMMANDS = [
  'help',
  'commands',
  'init',
  'login',
  'share',
  'collect',
  'preview',
  'publish',
  'open',
  'scan',
  'status',
  'doctor',
  'version',
  'drafts',
  'discard',
  'rotate',
  'logout',
  'completion'
] as const;

export type PublicCommand = (typeof PUBLIC_COMMANDS)[number];

export type CommandGroup = {
  readonly title: string;
  readonly commands: readonly PublicCommand[];
};

export const COMMAND_DESCRIPTIONS: Readonly<Record<PublicCommand, string>> = {
  help: 'Show root or command-specific help',
  commands: 'List available AgentFeed commands',
  init: 'Initialize AgentFeed in the current project',
  login: 'Connect this machine through browser approval',
  share: 'Collect, preview, and optionally upload in one workflow',
  collect: 'Collect local agent work into a private review draft',
  preview: 'Preview a saved local draft',
  publish: 'Upload a saved draft as a private review draft',
  open: 'Open a trusted review URL from an uploaded draft',
  scan: 'Scan and redact public draft fields',
  status: 'Show credentials, project, and draft status',
  doctor: 'Run local diagnostics',
  version: 'Print the installed AgentFeed CLI version',
  drafts: 'List local draft summaries',
  discard: 'Delete a local draft',
  rotate: 'Replace the saved ingestion token',
  logout: 'Remove saved credentials',
  completion: 'Print shell completion script'
};

export const COMMAND_EXAMPLES: Readonly<Record<PublicCommand, string>> = {
  help: 'agentfeed help share',
  commands: 'agentfeed commands',
  init: 'agentfeed init',
  login: 'agentfeed login',
  share: 'agentfeed share --dry',
  collect: 'agentfeed collect --explain',
  preview: 'agentfeed preview --latest',
  publish: 'agentfeed publish --latest --yes',
  open: 'agentfeed open --latest',
  scan: 'agentfeed scan --latest --dry-run',
  status: 'agentfeed status',
  doctor: 'agentfeed doctor',
  version: 'agentfeed version',
  drafts: 'agentfeed drafts',
  discard: 'agentfeed discard --id <draft_id>',
  rotate: 'agentfeed rotate',
  logout: 'agentfeed logout',
  completion: 'agentfeed completion zsh'
};

export const COMMAND_USAGE_OVERRIDES: Readonly<Partial<Record<PublicCommand, string>>> = {
  completion: 'agentfeed completion <shell>'
};

export const COMMAND_GROUPS: readonly CommandGroup[] = [
  { title: 'Start', commands: ['help', 'commands', 'init', 'login', 'status'] },
  { title: 'Share work', commands: ['share', 'collect', 'preview', 'publish', 'open'] },
  { title: 'Privacy and drafts', commands: ['scan', 'drafts', 'discard'] },
  { title: 'Automation', commands: ['completion'] },
  { title: 'Account and diagnostics', commands: ['doctor', 'version', 'rotate', 'logout'] }
];

const KNOWN_COMMAND_NAMES = [
  'help',
  'commands',
  'init',
  'login',
  'logout',
  'status',
  'rotate',
  'version',
  'token',
  'collect',
  'share',
  'preview',
  'publish',
  'scan',
  'hook',
  'doctor',
  'drafts',
  'discard',
  'open',
  'completion'
] as const;

export const KNOWN_COMMANDS: ReadonlySet<string> = new Set(KNOWN_COMMAND_NAMES);
