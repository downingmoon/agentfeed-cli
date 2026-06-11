---
title: CLI Trailing Help Alias Split 2026-06-12
aliases:
  - CLI trailing help alias helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Trailing Help Alias Split 2026-06-12

## Result

Trailing help alias detection now lives in `src/cli/trailing-help-alias.ts` instead of the oversized CLI entrypoint.

## Scope

- Added `isTrailingHelpAlias` as a focused typed helper for `agentfeed <command> help` and `agentfeed token rotate help` compatibility.
- Added `tests/trailing-help-alias.test.ts` to lock accepted and rejected trailing-help shapes.
- Updated `src/cli/index.ts` to call the helper from `main()`.

## Verification

- Red test first: `npx vitest run tests/trailing-help-alias.test.ts --reporter=verbose` failed before implementation because the module did not exist.
- `npm run build` passed.
- Focused Vitest passed: `npx vitest run tests/trailing-help-alias.test.ts tests/cli-help.test.ts --reporter=verbose` — 39 tests.
- CLI smoke passed:
  - `node dist/cli/index.js status help` returned exit 0 with status help output.
  - `node dist/cli/index.js token rotate help` returned exit 0 with token rotate help output.
- Full suite passed: `npm test -- --run` — 64 files, 688 tests.
- `git diff --check` passed.
- Strict grep passed for touched TS/test files.
- LSP diagnostics were not available because `typescript-language-server` is not installed in this environment; user previously declined installation.

## Size review

- `src/cli/index.ts`: 2823 pure LOC; still an inherited oversized defect, but this slice reduced it by 3 pure LOC while moving alias parsing out.
- `src/cli/trailing-help-alias.ts`: 8 pure LOC.
- `tests/trailing-help-alias.test.ts`: 11 pure LOC.

## Constraints honored

- No server, deploy, infra, or CI/CD work.
- No CLI/frontend/backend contract change.
- No new product feature; internal parser boundary quality only.
- Work documented for the active enterprise-readiness loop.

## Follow-up

> [!todo]
> Continue reducing `src/cli/index.ts` with behavior-locked parser/helper extractions; next candidates should preserve help/alias wording through CLI smoke before commit.
