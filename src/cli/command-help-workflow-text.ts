export const WORKFLOW_COMMAND_HELP_TEXT: Readonly<Record<string, string>> = {
  collect: `Usage: agentfeed collect [options]

Collect local agent work into a private review draft.
By default, collect saves locally and does not upload.
Omit --source to auto-detect Claude/Codex/Cursor/Gemini/Antigravity logs.

When to use:
  Use for advanced collection control before previewing or publishing.

Common options:
  --source <source>         Override source (auto-detect is default)
      Values: claude-code, codex, cursor, gemini-cli, antigravity-cli, other
  --session-file <path>     Read an explicit agent session file
  --since <timestamp>       Start window (ISO timestamp or last-collect)
  --until <timestamp>       End collection window (ISO timestamp)
  --all                     Ignore the saved collection cursor
  --force                   Recollect even if a matching draft already exists
  --dry, --dry-run          Keep draft local; collect uploads only with --upload
  --explain                 Include collection source/quality diagnostics
  --run-configured-commands Run configured local evidence commands

Advanced options:
  --json                    Print the draft JSON
  --upload                  Upload after collecting
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --no-save-cursor          Do not advance the collection cursor
  --no-upload               Suppress legacy auto_upload reminder
  --help, -h                Show this help

Examples:
  agentfeed collect --explain
  agentfeed collect --dry-run --explain
  agentfeed collect --source codex --session-file ~/.codex/session.jsonl --all
  agentfeed collect --json --no-save-cursor`,
  share: `Usage: agentfeed share [options]

Collect, preview, and optionally upload a private review draft.
Use this as the daily one-command workflow.
Omit --source to auto-detect Claude/Codex/Cursor/Gemini/Antigravity logs.

When to use:
  Use after an AI coding session to make a reviewable worklog.

Options:
  --yes, -y                 Upload without interactive confirmation
  --dry, --dry-run          Collect and preview only; do not upload
  --source <source>         Override source (auto-detect is default)
      Values: claude-code, codex, cursor, gemini-cli, antigravity-cli, other
  --session-file <path>     Read an explicit agent session file
  --since <timestamp>       Start window (ISO timestamp or last-collect)
  --until <timestamp>       End collection window (ISO timestamp)
  --all                     Ignore the saved collection cursor
  --force                   Recollect even if a matching draft already exists
  --explain                 Include collection source/quality diagnostics
  --no-save-cursor          Do not advance the collection cursor after upload
  --note <text>             Attach a user note to the draft
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --no-clipboard, --no-clip Do not copy the review URL
  --json                    Print machine-readable output
  --clipboard               Copy review URL when --json is used
  --run-configured-commands Run configured local evidence commands
  --help, -h                Show this help

Examples:
  agentfeed share --dry
  agentfeed share --dry --explain
  agentfeed share --dry --no-save-cursor
  agentfeed share --note "Fixed auth flow"
  agentfeed share --yes --open-review`,
  preview: `Usage: agentfeed preview [options]

Render a saved local draft preview.

When to use:
  Use before publishing to inspect the public-safe draft content.

Options:
  --latest                  Preview the newest local draft (default)
  --id <draft_id>           Preview a specific draft
  --json                    Print the local draft JSON with next actions
  --remote                  Validate/render preview through the API
  --help, -h                Show this help`,
  publish: `Usage: agentfeed publish [options]

Upload a saved local draft as a private AgentFeed review draft.

When to use:
  Use after previewing a local draft and logging in.

Options:
  --latest                  Publish the newest local draft (default)
  --id <draft_id>           Publish a specific draft
  --yes, -y                 Upload without interactive confirmation
  --json                    Print machine-readable upload output
  --clipboard               Copy review URL when --json is used
  --no-clipboard            Do not copy the review URL
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --help, -h                Show this help

Examples:
  agentfeed publish --latest --yes
  agentfeed publish --id draft_20260606_120000_abcd --yes --open-review
  agentfeed publish --latest --json --clipboard`,
  scan: `Usage: agentfeed scan [options]

Scan and redact public fields before sharing.

When to use:
  Use when a draft may contain secrets or sensitive project details.

Options:
  --latest                  Scan the newest local draft (default)
  --id <draft_id>           Scan a specific draft
  --path <path>             Scan changed-area labels from a path's git state
  --dry-run, --dry          Report findings without modifying a draft
  --json                    Print machine-readable scan output
  --help, -h                Show this help

Examples:
  agentfeed scan --latest --dry-run
  agentfeed scan --id draft_20260606_120000_abcd
  agentfeed scan --path .`,
  hook: `Usage: agentfeed hook uninstall claude-code [options]

Deprecated legacy cleanup for the AgentFeed Claude Code hook.
Hook install is disabled; use explicit transcript collection instead.

When to use:
  Use only to remove an older AgentFeed Claude Code hook from settings.

Options:
  --global                  Modify the global Claude Code settings
  --project                 Use project settings (default)
  --settings-path <path>    Override the Claude Code settings path
  --json                    Print machine-readable cleanup result
  --help, -h                Show this help

Examples:
  agentfeed hook uninstall claude-code
  agentfeed collect --source claude-code --explain
  agentfeed share --dry`,
  doctor: `Usage: agentfeed doctor

Run local AgentFeed diagnostics for credentials, API reachability,
project config, git, and agent signals.

When to use:
  Run when collection, login, upload, or agent detection looks wrong.

Options:
  --json                    Print machine-readable diagnostics
  --help, -h                Show this help`,
  drafts: `Usage: agentfeed drafts [options]

List saved local draft summaries and next actions.

When to use:
  Use to find pending drafts and the next publish or preview command.

Options:
  --json                    Print machine-readable draft summaries
  --help, -h                Show this help`,
  discard: `Usage: agentfeed discard [options]

Delete a saved local draft after explicit confirmation.

When to use:
  Use to remove stale, duplicate, or unwanted local drafts.

Options:
  --latest                  Discard the newest local draft (default)
  --id <draft_id>           Discard a specific draft
  --yes, -y                 Delete without the confirmation preview
  --json                    Print machine-readable discard status
  --help, -h                Show this help`,
  open: `Usage: agentfeed open [options]

Reopen a trusted review URL from a previously uploaded draft.

When to use:
  Use after publishing when you need to return to the review page.

Options:
  --latest                  Open the newest uploaded draft (default)
  --id <draft_id>           Open a specific draft's review URL
  --json                    Print machine-readable review URL handoff status
  --help, -h                Show this help

Examples:
  agentfeed open --latest
  agentfeed open --id draft_20260606_120000_abcd`,
  completion: `Usage: agentfeed completion <shell>

Print a shell completion script for AgentFeed commands and options.

When to use:
  Use once per shell to enable tab completion.

Supported shells: zsh, bash, fish

Examples:
  agentfeed completion zsh > ~/.zsh/completions/_agentfeed
  agentfeed completion bash > agentfeed.bash
  agentfeed completion fish > agentfeed.fish

Install:
  agentfeed completion zsh > _agentfeed
  agentfeed completion bash > agentfeed.bash
  agentfeed completion fish > agentfeed.fish
  Move the generated file into your shell completion directory.
  Restart your shell after installing completions.

Options:
  --help, -h                Show this help`
};
