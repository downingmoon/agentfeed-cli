---
title: CLI Test Command Output Parser Split 2026-06-23
aliases:
  - CLI test command output parser split
  - Test command output parser split
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - collectors
  - configured-commands
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: c1a884359faf358702a365cd1b96ee76cdd11da1
---

# CLI Test Command Output Parser Split 2026-06-23

> [!success]
> CLI configured-command output parsing ownership split completed. No new product feature, server, infra, CI/CD, push, or deploy change was made.

## Scope

- Split configured test command output parsing out of `src/collectors/test-command.ts`.
- Preserve the existing public import path for `parseTestCommandOutput` through re-export from `src/collectors/test-command.ts`.
- Keep configured command resolution, execution, timeout, safety, and metric behavior unchanged.

## Code changes

- `src/collectors/test-command.ts`
  - Imports and re-exports `parseTestCommandOutput` from `./test-command-output.js`.
  - Keeps configured command inference, safety checks, command execution, timeout, and metric collection.
- `src/collectors/test-command-output.ts`
  - New internal parser module for TAP, cargo-like `test result`, pytest/vitest/status summary parsing.
  - Uses readonly parser result shape.

## Size result

| File | Before pure LOC | After pure LOC |
| --- | ---: | ---: |
| `src/collectors/test-command.ts` | 308 | 228 |
| `src/collectors/test-command-output.ts` | 0 | 82 |

Both files are under the 250 pure LOC ceiling.

## Verification

- LSP diagnostics attempted on changed TS files.
  - Result: failed with `Transport closed`.
  - Fallback evidence: typecheck, build, targeted tests, full suite, and built CLI smoke.
- `npm test -- --run tests/test-command.test.ts tests/git-draft-configured-commands.test.ts tests/git-draft-configured-command-auto.test.ts tests/git-draft-configured-command-safety.test.ts tests/session-collector-codex-command-metrics.test.ts tests/duplicate-draft-policy.test.ts tests/cli-share-dry-run-command-policy.test.ts`
  - Passed, 7 files / 26 tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Changed-file no-any grep: passed.
- `npm test -- --run`: passed, 226 files / 848 tests.
- Built CLI smoke:
  - Initialized a temporary git project with `dist/cli/index.js init`.
  - Configured `.agentfeed/config.json` with `run_tests_on_collect=true` and `commands.test='node .agentfeed/test-pass.mjs'`.
  - Ran `dist/cli/index.js collect --source other --all --run-configured-commands --json`.
  - Asserted `tests_run=9`, `tests_passed=7`, `commands_run=1`, `failed_commands=null`.
  - Asserted raw command output was not included in draft JSON.

## Commit

- Code: `c1a884359faf358702a365cd1b96ee76cdd11da1` — `Split test command output parsing`

## Constraints honored

- No new dependencies.
- No new app feature.
- No server, infra, or CI/CD changes.
- No push or deploy.
- Existing public parser import path preserved.

## Related

- [[Active Tasks]]
