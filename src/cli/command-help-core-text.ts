export const CORE_COMMAND_HELP_TEXT: Readonly<Record<string, string>> = {
  token: `Usage: agentfeed token rotate [options]

Compatibility alias for:
  agentfeed rotate

When to use:
  Prefer agentfeed rotate unless another script still calls this alias.

Options:
  --browser                 Force browser-based token replacement
  --no-open                 Print the auth URL instead of opening a browser
  --no-save                 Do not persist the replacement token
  --api-base-url <url>      Override the AgentFeed API base URL
  --help, -h                Show this help`,
  help: `Usage: agentfeed help [command]

Show AgentFeed root help or command-specific help.

When to use:
  Use this when you forget a command or want command-specific options.

Examples:
  agentfeed help
  agentfeed help collect
  agentfeed collect help
  agentfeed help token rotate

Equivalent forms:
  agentfeed --help
  agentfeed <command> --help

Options:
  --help, -h                Show this help`,
  commands: `Usage: agentfeed commands [options]

List available AgentFeed commands grouped by workflow area.

When to use:
  Use this to pick the right command for setup, sharing, or debugging.

Equivalent forms:
  agentfeed help
  agentfeed --help

Options:
  --json                    Print machine-readable command catalog
  --help, -h                Show this help`,
  version: `Usage: agentfeed version [options]

Print the installed AgentFeed CLI version.

When to use:
  Use this for bug reports, support, and release checks.

Equivalent forms:
  agentfeed --version
  agentfeed -v

Options:
  --json                    Print machine-readable version output
  --help, -h                Show this help`,
  init: `Usage: agentfeed init [options]

Initialize .agentfeed/config.json in the current git project.

When to use:
  Run once in each project before collecting AgentFeed drafts.

Options:
  --project-name <name>     Override the detected project name
  --no-git-check            Allow initialization outside a git repository
  --force                   Recreate config after backing up existing files
  --json                    Print machine-readable initialization result
  --help, -h                Show this help`,
  login: `Usage: agentfeed login [options]

Connect this machine to AgentFeed.
Without token input, login starts safe browser approval.

When to use:
  Run before uploading or after status says the token is missing.

Options:
  --no-open                 Print the auth URL instead of opening a browser
  --browser                 Allow browser login even in CI-like environments
  --no-save                 Do not persist credentials
  --api-base-url <url>      Override the AgentFeed API base URL
  --token-stdin             Read an ingestion token from stdin
  --token -                 Read an ingestion token from stdin
  --json                    Print machine-readable token-input login result
  --help, -h                Show this help

Examples:
  agentfeed login
  agentfeed login --no-open
  printf %s "$TOKEN" | agentfeed login --token-stdin
  printf %s "$TOKEN" | agentfeed login --token-stdin --json
  agentfeed login --api-base-url http://localhost:8001/v1

Safety:
  Prefer --token-stdin so tokens do not appear in shell history.
  Remote http API URLs need AGENTFEED_ALLOW_INSECURE_API=1.
  Use that override only for development.`,
  logout: `Usage: agentfeed logout [options]

Remove saved AgentFeed credentials from this machine.

When to use:
  Run when switching accounts or disconnecting this device.

Options:
  --json                    Print machine-readable logout status
  --help, -h                Show this help

Examples:
  agentfeed logout
  agentfeed logout --json
  agentfeed status

Safety:
  Logout removes AgentFeed credentials saved by the CLI.
  If AGENTFEED_TOKEN is set in your shell, unset it separately.
  Rotate that environment secret if needed.
  Run agentfeed status after logout to confirm no active token remains.`,
  status: `Usage: agentfeed status

Show credential, API, project, hook, draft, and collection cursor status.

When to use:
  Run when setup feels stuck or before sharing from a new shell.

Options:
  --json                    Print machine-readable status
  --help, -h                Show this help`,
  rotate: `Usage: agentfeed rotate [options]

Replace the saved ingestion token through browser approval.

When to use:
  Run when a token expires, leaks, or belongs to the wrong account.

Options:
  --browser                 Force browser-based token replacement
  --no-open                 Print the auth URL instead of opening a browser
  --no-save                 Do not persist the replacement token
  --api-base-url <url>      Override the AgentFeed API base URL
  --help, -h                Show this help

Examples:
  agentfeed rotate
  agentfeed rotate --no-open
  agentfeed rotate --browser

Safety:
  Rotation revokes the previous saved token when AgentFeed can verify it.
  If AGENTFEED_TOKEN is set in your shell, update it separately.
  Unset the environment token if you want the saved token to apply.`
};
