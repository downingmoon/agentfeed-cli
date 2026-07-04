---
title: CLI Command Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Command Recovery Refactor 2026-06-11

## Result

Extracted basic CLI command recovery message formatting from the oversized entrypoint into `src/cli/command-recovery.ts`.

## Changed

- `src/cli/command-recovery.ts`
  - Owns `commandHelpHint`, `commandUsageError`, and `conflictingOptionsError`.
  - Preserves special help routing for `token` and `help` commands.
- `src/cli/index.ts`
  - Imports the extracted helpers while keeping `COMMAND_ARG_SPECS` and validation orchestration local.
- `tests/cli-command-recovery.test.ts`
  - Adds focused coverage for command-specific help hints, usage errors with suggestions, and conflicting option recovery text.

## Verification

- Red check: `npx vitest run tests/cli-command-recovery.test.ts --reporter=verbose` failed first because `src/cli/command-recovery.js` did not exist.
- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery.test.ts tests/cli-help.test.ts tests/cli-collect.test.ts --reporter=verbose` passed: 3 files, 64 tests.
- `npm test -- --run` passed: 48 files, 643 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for changed TS files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 19 pure LOC.
  - `tests/cli-command-recovery.test.ts`: 25 pure LOC.
  - `src/cli/index.ts`: 2966 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because the TypeScript LSP server is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting command validation helpers in smaller verified pieces.
- Candidate: `helpTopicError`, because it is a pure message helper but depends on `PUBLIC_COMMANDS`/`closestMatch` only lightly.
