---
title: CLI Claude Settings Hook Shape Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/cli
  - enterprise-hardening
  - claude-code
  - validation
status: done
---

# CLI Claude Settings Hook Shape Guard 2026-06-10

## Context

Claude Code hook installation edits a user-owned `.claude/settings.json` file. The previous implementation validated the settings root, but then used broad `as unknown[]` casts around `hooks.Stop`.

If `hooks` was not a JSON object, or if `hooks.Stop` existed but was not an array, `agentfeed hook install claude-code` could silently mutate or replace the user's existing settings shape.

## Decision

Fail closed at the Claude settings boundary instead of repairing ambiguous user configuration shapes.

- Removed `as unknown` and `as unknown[]` casts from `src/hooks/claude-code-settings.ts`.
- Added explicit `hooks` and `hooks.Stop` shape checks before mutation.
- Kept the existing behavior of creating missing `hooks`/`Stop` when they are absent.
- Kept uninstall scoped to valid Stop arrays and removed the remaining object spread assertion.

## Regression coverage

Added `tests/claude-code-settings.test.ts`:

- Given `.claude/settings.json` with `hooks: []`
- When installing the Claude Code hook
- Then CLI logic rejects it with actionable guidance and leaves the file unchanged

- Given `.claude/settings.json` with `hooks.Stop` as an object
- When installing the Claude Code hook
- Then CLI logic rejects it with actionable guidance and leaves the file unchanged

## Verification

- Red test confirmed both malformed settings cases previously resolved instead of rejecting.
- `npm test -- --run tests/claude-code-settings.test.ts` passed.
- `npm test -- --run tests/claude-code-settings.test.ts tests/api-hook.test.ts` passed: 2 files / 134 tests.
- `npm run clean && npm run build && npm run typecheck && npm test -- --run` passed: 31 files / 597 tests.
- CLI smoke through `node dist/cli/index.js hook install claude-code --settings-path ...` returned exit 1 with: `Claude Code settings hooks must be a JSON object ...`.
- Escape-hatch scan found no `as unknown`, `as any`, `any`, `@ts-ignore`, or `@ts-expect-error` in the changed hook files.
- Pure LOC:
  - `src/hooks/claude-code-settings.ts`: 166
  - `tests/claude-code-settings.test.ts`: 30

> [!warning] LSP gap
> MCP LSP diagnostics could not run because `typescript-language-server` is not installed locally. `tsc --noEmit` passed and was used as the authoritative type gate.

## Follow-up

- Continue reducing broad test-file `any` usage when those tests are touched, preferably by creating focused test files instead of extending oversized suites.
- Continue splitting oversized CLI modules only alongside behavior-preserving, tested hardening work.
