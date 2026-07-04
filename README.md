# AgentFeed CLI

AgentFeed CLI turns local AI-agent work into reviewable, public-safe worklog drafts. It is designed for the same terminal-first feel as modern agent CLIs: command-first help, browser login, local draft review, explicit upload, copyable review URLs, JSON automation contracts, and clear recovery hints when something is missing.

What it collects locally:

- Git change metrics and changed areas
- Claude Code, Codex CLI, Gemini/Antigravity CLI, Cursor, OMC, OMX, and Superpowers aggregate session signals
- Safe metrics such as models, tokens, tool calls, commands, tests, subagents, skills, and collection quality

What it does **not** upload:

- Raw transcripts
- Raw diffs or file contents
- `.env` files, credentials, private keys, or local secret values

## Install

Requires Node.js 20+. The npm package is configured as `agentfeed-cli` and exposes the `agentfeed` command:

```bash
npm install -g agentfeed-cli
agentfeed --version
agentfeed commands
```

Recommended installed-user flow:

```bash
agentfeed commands          # see guided workflows and when to use each command
agentfeed init              # create .agentfeed/config.json for this repo
agentfeed login             # browser approval or token stdin setup
agentfeed share --dry       # collect + preview without uploading
agentfeed share --yes --open-review
```

If you are not logged in yet, `agentfeed share` still creates a local preview and tells you the exact `agentfeed login` / `agentfeed publish` next actions. Uploading to AgentFeed always requires a token and explicit upload intent.

For local development before an npm release, link the checked-out repository:

```bash
npm ci
npm run build
npm link
agentfeed --version
```

For release verification, build and inspect the npm tarball from this repository. Run this before direct pushes to `main`; GitHub CI is intentionally PR/manual scoped while this private repository is under Actions usage limits.

```bash
npm ci
npm run release:preflight
```

`release:preflight` first runs the normal `prepack` clean/build/typecheck/test
gate, then verifies `npm pack --dry-run --json` output so stale `dist/` cannot
pass a local release check. It also verifies that the publish tarball contains
the built CLI and excludes source, tests, local drafts, env files, and agent
runtime state, then installs that tarball into a temporary project and executes
the installed `agentfeed --help`, `agentfeed --version`, and first-run
`init`/`status`/`share --dry`/`drafts` workflow through the packaged binary path.
CI also runs this installed-package smoke on Windows so the npm-generated
`agentfeed.cmd` wrapper is covered before release.

## Release and provenance

The package is configured for public npm publishing (`publishConfig.access:
public`) with provenance enabled (`publishConfig.provenance: true`), but keeps
`"license": "UNLICENSED"` until the project owner chooses an open-source or
commercial license. Treat that as all rights reserved / no usage grant for
consumers; do not replace it with an SPDX license without an explicit owner
decision.

Recommended release gate:

```bash
npm ci
npm run release:preflight
```

For provenance-backed npm releases, use the checked-in GitHub Actions
`Release` workflow after configuring npm trusted publishing for this repository
and workflow. That workflow uses OIDC (`id-token: write`), Node.js 22.14.0, npm
11.6.0, `npm run release:preflight`, and then `npm publish --access public`.
Trusted publishing automatically generates provenance through OIDC; do not add
`--provenance` to that trusted publishing command.

npm's current provenance requirements include a public source repository whose
`package.json.repository` matches the publishing repository. If this GitHub repo
stays private, provenance will not be generated. A temporary non-provenance
manual publish is an explicit owner exception and must document that lower trust
posture before overriding the package-level provenance setting. See:

- https://docs.npmjs.com/generating-provenance-statements
- https://docs.npmjs.com/trusted-publishers
- https://docs.npmjs.com/cli/v11/commands/npm-publish/

## Quickstart

First setup:

```bash
agentfeed commands
agentfeed init
agentfeed login
agentfeed status
```

`agentfeed commands` shows guided workflows. `agentfeed status` summarizes setup progress, and `agentfeed doctor` lists the first fix to try when setup is incomplete.

Daily one-command workflow:

```bash
agentfeed share --dry
agentfeed share --yes --open-review
```

`share --dry` collects and previews locally. `share --yes --open-review` collects, previews, uploads a private review draft, then opens the review URL.

Draft-by-draft review workflow:

```bash
agentfeed collect --explain
agentfeed preview --latest
agentfeed publish --latest --yes
agentfeed open --latest
```

Use the draft-by-draft flow when you want to inspect collection diagnostics or run `agentfeed scan` before uploading.

Discovery and troubleshooting:

```bash
agentfeed doctor
agentfeed commands
agentfeed help share
agentfeed collect --source codex --explain
agentfeed collect --source gemini-cli --explain
agentfeed collect --source antigravity-cli --explain
agentfeed collect --source claude-code --session-file "$CLAUDE_SESSION_FILE" --explain
agentfeed hook install claude-code
```

If `doctor` detects global agent logs but `collect --explain` says no session matched this project root, run `agentfeed` from the same initialized repository root where the agent worked. For parent-workspace or monorepo sessions, initialize and collect from that parent root, or pass a session file that belongs to the current project.

The CLI creates `.agentfeed/drafts/*.json` first and uploads only reviewable private drafts. It does not upload raw diffs, raw transcripts, `.env` contents, or secrets.


## Login and token rotation

`agentfeed login` opens the AgentFeed browser approval flow by default. If you already have a token from AgentFeed Settings or a secret manager, prefer stdin so the raw secret is not stored in shell history or process argv:

```bash
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token - --no-save
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin --json
```

Literal `agentfeed login --token <token>` input is disabled by default because raw secrets can leak through shell history and process listings. Use stdin (`--token-stdin` or `--token -`) for existing tokens; a local throwaway development escape hatch exists only when `AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1` is set.

Use `login --token-stdin --json` for headless setup. Browser login remains human-readable because it must show the authorization URL and approval code; `login --json` without token input exits with a recovery command instead of mixing browser prompts into JSON stdout.

### Self-hosted or local development API

For localhost development, set the API base URL before login or any upload command:

```bash
AGENTFEED_API_BASE_URL=http://localhost:8001/v1 agentfeed login
```

For the current AgentFeed staging/production domain, the default CLI API is already `https://agentfeed.api.downingmoon.dev/v1`. To pin it explicitly:

```bash
AGENTFEED_API_BASE_URL=https://agentfeed.api.downingmoon.dev/v1 agentfeed login
```

For a private server reachable by IP over plain HTTP, make the development-only override explicit:

```bash
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 \
agentfeed login
```

Production API URLs should use HTTPS. Run `agentfeed doctor` after changing `AGENTFEED_API_BASE_URL` so the CLI can verify metadata, token validity, and review URL handoff settings.

When a saved device token is near expiry or compromised, run:

```bash
agentfeed rotate
agentfeed rotate --browser
```

`agentfeed rotate` uses browser approval before issuing the replacement token. The older `agentfeed token rotate` spelling is kept only as a compatibility alias; prefer `agentfeed rotate` in scripts and docs. When the saved token can be verified first, the backend revokes that previous token during the browser-approved exchange. The raw replacement token is saved locally and never printed. Token-authenticated self-rotation is intentionally not supported because a leaked token must not be able to mint a fresh long-lived token by itself.

| Token source | Recommended rotation path | Result |
| --- | --- | --- |
| Saved credentials file | `agentfeed rotate` | Opens AgentFeed approval, revokes the previous saved token when it can be verified, and writes the replacement to `~/.agentfeed/credentials.json`. |
| Browser replacement | `agentfeed rotate --browser` | Opens AgentFeed approval and saves the replacement token locally; if the saved token is still verifiable, it is replaced during exchange. |
| `AGENTFEED_TOKEN` environment variable | Rotate or issue a token in AgentFeed Settings, update your shell/secret manager, then run `agentfeed status`. Or run `unset AGENTFEED_TOKEN && agentfeed rotate --browser` to switch back to saved credentials. | The CLI never mutates environment variables in place and never prints raw browser-issued tokens. |

Use `agentfeed doctor` to check server-side token validity and expiry.

### Credential storage policy

Saved browser-login or stdin-login tokens prefer native OS-protected storage when available: `security` on macOS, `secret-tool` on Linux, and Windows DPAPI via PowerShell on Windows. The saved `credentials.json` stores only metadata for keychain-backed credentials; the raw token stays out of the credentials file. To intentionally store the token in the private local credentials file, set:

```bash
AGENTFEED_CREDENTIAL_STORE=file agentfeed login
```

`AGENTFEED_CREDENTIAL_STORE=auto` does **not** silently downgrade to file storage when the keychain is unavailable or locked. If you need a break-glass fallback for one login, make it explicit with `AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1`; otherwise choose `AGENTFEED_CREDENTIAL_STORE=file` or use `AGENTFEED_TOKEN` from your secret manager.


## Shell completion

Generate completion scripts from the same command metadata used by help and option validation:

```bash
agentfeed completion zsh > _agentfeed
agentfeed completion bash > agentfeed.bash
agentfeed completion fish > agentfeed.fish
```

Move the generated file into your shell completion directory, then restart the shell. Common destinations are:

- `~/.zsh/completions/_agentfeed`
- `~/.local/share/bash-completion/completions/agentfeed`
- `~/.config/fish/completions/agentfeed.fish`

Zsh and fish completions include human-readable option descriptions and value hints for options that require parameters.

`agentfeed commands --json` exposes the same command catalog for tools: each command includes description, usage, help/example commands, flags, value-taking options, conflicting option pairs, and completion words. Use it when another agent or script needs to discover the CLI safely instead of hard-coding command syntax.

## One-command sharing

`agentfeed share` is the recommended daily command. It creates a local draft, prints the public-safe preview that will be uploaded, and requires explicit upload intent before creating a private AgentFeed review draft. If no token is configured, it does **not** throw away the collection result: it keeps the local draft, prints `Upload skipped: AgentFeed token is missing`, and shows the login/publish commands needed to finish. Use `--yes` for human-readable uploads, or `--json` when a machine will inspect the returned upload/handoff object; CI/non-interactive runs are not exempt from this private-review upload gate.

```bash
agentfeed share              # collect -> preview, then print the exact --yes command for interactive upload
agentfeed share --yes        # collect -> preview -> upload private review draft
agentfeed share --dry        # collect + preview only, keep the local draft
agentfeed share --open-review     # force browser handoff after upload
agentfeed share --no-open-review  # suppress project-configured browser handoff
agentfeed share --note "Fixed auth flow"
agentfeed share --no-clipboard
agentfeed share --json --clipboard   # automation JSON keeps clipboard off unless explicitly requested
agentfeed share --source codex
agentfeed share --source gemini-cli --session-file ./session.jsonl
agentfeed share --source antigravity-cli --session-file ./transcript.jsonl
agentfeed share --run-configured-commands
```

`--note` is stored as a separate public-safe author note, not folded into the generated worklog summary.

Use `--json` for automation. Dry-run output is shaped as `{ dry_run, reused_existing_draft, draft, privacy_policy }`; upload output is shaped as `{ dry_run, reused_existing_draft, draft_id, draft, upload, privacy_policy, handoff }` so scripts can verify the exact public-safe draft that was uploaded alongside the review URL. JSON mode has no clipboard/browser side effects unless `--clipboard` or `--open-review` is passed explicitly; when either handoff is requested, `handoff.clipboard` / `handoff.browser` reports `{ requested, ok, warning? }` without adding non-JSON text to stdout.

### JSON failure contract

Commands that receive `--json` keep stdout parseable even when they fail. They
exit non-zero and print a structured error object to stdout instead of mixing
human-readable recovery text into stderr:

```json
{
  "error": {
    "code": "no_local_drafts_found",
    "message": "No local drafts found.",
    "details": [
      "Create a draft:",
      "Run: agentfeed collect --explain",
      "Run: agentfeed share --dry"
    ]
  },
  "next_actions": [
    "agentfeed collect --explain",
    "agentfeed share --dry"
  ],
  "suggestions": []
}
```

`next_actions` is extracted from `Run:`, `Try:`, and `Use:` recovery lines so
automation can offer or execute the next safe command without parsing prose.
`suggestions` contains command/option typo suggestions from `Did you mean:`
lines. Non-JSON failures continue to use human-readable stderr.

## `collect --json` automation contract

`agentfeed collect --json` prints the local draft object as the JSON root and adds `next_actions`. Automation should read draft fields such as `id`, `source`, `worklog`, `privacy_policy`, and `upload` directly from the root object. Pending drafts point at `preview` and `publish`; when `--upload` is also passed, the same draft-root shape is preserved, `draft.upload` is updated with the upload result (`uploaded`, `worklog_id`, `review_url`, `uploaded_at`), and `next_actions` points at `open` and `preview`. If `--open-review` is requested, `draft.upload.handoff.browser` reports whether the browser handoff succeeded. Unlike `share --json`, `collect --json` is intentionally **not** wrapped in a `{ draft, upload }` envelope; this keeps existing scripts compatible.

## `preview --json` automation contract

`agentfeed preview --json` prints the sanitized local draft as the JSON root and adds `next_actions` so tools can continue without parsing human preview text. Pending drafts point at `publish` and `scan`; already-uploaded drafts point at the trusted `open` flow and `scan`. `agentfeed preview --remote --json` includes the Backend preview result plus `draft_id` and `next_actions`; invalid remote previews guide tools to scan and retry the remote preview before publishing.

## Scoped and incremental collection

By default, successful `collect` and non-dry `share` runs save `.agentfeed/state.json` with the last collection timestamp. Later runs use that timestamp as the default lower bound so long-lived agent sessions do not get counted repeatedly.

```bash
agentfeed collect --explain       # shows the collection window
agentfeed collect --since 2026-05-20T01:00:00Z
agentfeed collect --until 2026-05-20T02:00:00Z
agentfeed collect --all           # ignore the saved cursor for a full rescan
agentfeed share --all             # same for one-command sharing
```



`collect` combines Git metrics with local agent session metadata when available. Claude Code JSONL transcripts, Codex JSONL rollouts, Gemini CLI chat logs, Antigravity transcript logs, and OMC/OMX/Superpowers metadata are parsed locally for safe aggregate data such as edited file paths, line counts, token usage, test commands, failed commands, tool calls, skills used, subagent counts, collection quality, model, and session id; raw transcript content is not stored in the draft. Unknown local agent/plugin metadata is collected as low-confidence aggregate signals when no known agent session is found, and `--explain` shows the non-path source summary used for the draft.

Repo-local test/build commands are never executed by default, even when `.agentfeed/config.json` enables `collection.run_tests_on_collect`. Use `agentfeed collect --run-configured-commands` or `agentfeed share --run-configured-commands` only in repositories whose config and scripts you trust. Shell-interpreter wrappers such as `sh -c`, `bash -lc`, `zsh -c`, `cmd.exe /c`, or PowerShell are refused even with this flag; configure a direct test/build command such as `npm test`, `npm run build`, `pytest`, `go test ./...`, or `make test` instead. Configured commands also run with sensitive environment variables scrubbed (`AGENTFEED_TOKEN`, npm auth tokens, cloud credentials, and common `*_TOKEN`/`*_SECRET` names); use `AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST=NAME1,NAME2` only when you intentionally need to pass a specific variable.


## Diagnostics and duplicate safety

`agentfeed doctor` reports API reachability, ingestion token validity, and local Claude Code, Codex CLI, Gemini/Antigravity CLI, OMC, OMX, and Superpowers signals so setup problems are easier to diagnose.

Draft collection also records a stable fingerprint from `session_id + git head + collection_window`; repeated runs reuse the existing local draft unless `--force` or `--all` is used. If that draft was already uploaded, `share` / `publish` reuse the saved review URL instead of uploading a duplicate worklog.

Successful human-readable `share` / `publish` copies the review URL to the clipboard when the platform supports it. Use `--no-clipboard` to opt out. `--open-review` forces a browser handoff after upload; `--no-open-review` suppresses project-configured browser handoff for that run. If clipboard or browser opening is requested but unavailable, the CLI prints a visible warning and leaves the review URL in the output for manual copy/open.

Use `agentfeed open`, `agentfeed open --latest`, or `agentfeed open --id <draft_id>` to reopen a previously uploaded private review draft in your browser. Cached review URLs are opened only when they match the built-in AgentFeed review host, a safe local development host, the Backend-advertised `/v1/metadata` `review_base_url`, or an explicitly configured `AGENTFEED_REVIEW_BASE_URL` exact origin. For self-hosted deployments where the API and review frontend live on different hosts, prefer configuring Backend `FRONTEND_URL` so `/v1/metadata` exposes `review_base_url`; use `AGENTFEED_REVIEW_BASE_URL=https://review.example.com` only as a local override/fallback. Remote review origins must use HTTPS and cannot include credentials, query strings, hashes, or paths.

Use `agentfeed open --json` when another tool needs to hand off the review URL. The command still attempts the browser open, but stdout remains JSON shaped as `{ draft_id, review_url, opened, warnings, next_actions }` so automation can fall back to the URL without parsing human text.

## Privacy scan dry-run

Run a safe redaction preview before uploading or after manually editing a draft:

```bash
agentfeed scan --id <draft_id> --dry-run
agentfeed scan --id <draft_id>
```

`--dry-run` prints finding severity, field, redaction placeholder, and redacted preview without showing the original secret or modifying the draft. Without `--dry-run`, `scan` updates the draft's uploadable public fields with redacted values and saves the `privacy_scan` result. Use `--json` for automation; scan JSON is shaped as `{ dry_run, mode, target, saved, scan, redacted_fields, next_actions }` in dry-run, saved-draft, and path-inspection modes. The scanner redacts common API tokens, secret assignments, private key blocks, authorization headers, credentialed URLs, local/private URLs including IPv6/link-local metadata URLs, emails, and local filesystem paths.

`share` and `publish` upload a **private review draft**, not a public worklog. If high-severity findings remain, the CLI now states that public/unlisted publishing is blocked in AgentFeed until those findings are resolved, while the private review upload is still allowed so you can resolve the findings in the web review.
