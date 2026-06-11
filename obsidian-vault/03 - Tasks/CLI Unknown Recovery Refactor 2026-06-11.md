---
title: CLI Unknown Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Unknown Recovery Refactor 2026-06-11

## Result

Extracted unknown command and unknown option recovery message formatting from the oversized CLI entrypoint into `src/cli/command-recovery.ts`.

## Changed

- `src/cli/command-recovery.ts`
  - Added `unknownCommandErrorMessage` and `unknownOptionErrorMessage`.
  - Keeps typo suggestion behavior on the existing `closestMatch` helper.
- `src/cli/index.ts`
  - Keeps command validation orchestration local.
  - Delegates unknown command/option message calculation to `command-recovery.ts`.
- `tests/cli-command-recovery.test.ts`
  - Adds focused coverage for command typo suggestions, no-suggestion command errors, option typo suggestions, and no-suggestion option errors.

## Verification

- `npx vitest run tests/cli-command-recovery.test.ts tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 3 files, 46 tests.
- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery.test.ts tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts tests/cli-leading-option-recovery.test.ts --reporter=verbose` passed: 4 files, 49 tests.
- `npm test -- --run` passed: 50 files, 651 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 62 pure LOC.
  - `tests/cli-command-recovery.test.ts`: 49 pure LOC.
  - `src/cli/index.ts`: 2882 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` with behavior-locked slices.
- Candidate: completion shell recovery message or remaining option validation helper extraction.
