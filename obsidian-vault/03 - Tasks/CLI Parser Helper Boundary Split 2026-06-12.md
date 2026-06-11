---
title: CLI Parser Helper Boundary Split 2026-06-12
aliases:
  - CLI bare double dash and help flag helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Parser Helper Boundary Split 2026-06-12

## Result

Two small command-argument parser helpers moved out of the oversized CLI entrypoint while keeping public CLI behavior unchanged.

## Scope

- Added `src/cli/bare-double-dash-error.ts` to own bare `--` recovery `Error` construction.
- Added `src/cli/help-flag.ts` to own `--help` / `-h` detection.
- Added focused tests for both helpers.
- Updated `src/cli/index.ts` to consume the helpers and reduce entrypoint-local parser utility code.

## Verification

- Red tests first:
  - `npx vitest run tests/bare-double-dash-error.test.ts --reporter=verbose` failed before implementation because the module did not exist.
  - `npx vitest run tests/help-flag.test.ts --reporter=verbose` failed before implementation because the module did not exist.
- `npm run build` passed.
- Focused Vitest passed: `npx vitest run tests/bare-double-dash-error.test.ts tests/help-flag.test.ts tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` — 56 tests.
- CLI smoke passed:
  - `node dist/cli/index.js status --` returned exit 1 with `Unexpected argument for status: --`.
  - `node dist/cli/index.js status --help` returned exit 0 with status help output.
- Full suite passed: `npm test -- --run` — 63 files, 687 tests.
- `git diff --check` passed.
- Strict grep passed for touched TS/test files.
- LSP diagnostics were not available because `typescript-language-server` is not installed in this environment; user previously declined installation.

## Size review

- `src/cli/index.ts`: 2826 pure LOC; still an inherited oversized defect, but this slice reduced it by 1 pure LOC while moving parser helpers out.
- `src/cli/bare-double-dash-error.ts`: 4 pure LOC.
- `src/cli/help-flag.ts`: 3 pure LOC.
- `tests/bare-double-dash-error.test.ts`: 11 pure LOC.
- `tests/help-flag.test.ts`: 9 pure LOC.

## Constraints honored

- No server, deploy, infra, or CI/CD work.
- No CLI/frontend/backend contract change.
- No new product feature; internal parser/recovery boundary quality only.
- Work documented for the active enterprise-readiness loop.

## Follow-up

> [!todo]
> Continue reducing `src/cli/index.ts` through behavior-locked parser/recovery extractions only when each slice preserves CLI wording and passes full smoke/tests.
