---
title: CLI Hook Help Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Hook Help Recovery Refactor 2026-06-11

## Result

Extracted the remaining pure help/hook recovery message formatting from the oversized CLI entrypoint into `src/cli/command-recovery.ts`.

## Changed

- `src/cli/command-recovery.ts`
  - Added `helpTopicError`, `hookUsageMessage`, and `unsupportedHookTargetMessage`.
  - Keeps typo suggestions close to the existing `closestMatch` helper instead of duplicating message logic in the command table.
- `src/cli/index.ts`
  - Delegates help topic and hook recovery text to `command-recovery.ts`.
  - Removed an inherited non-null assertion in `cmdScan` by preserving the parsed `--path` value in `scanPath`.
- `tests/cli-command-recovery-extra.test.ts`
  - Locks help topic suggestions, hook usage guidance, and unsupported hook target recovery text.

## Verification

- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-command-recovery.test.ts --reporter=verbose` passed: 2 files, 6 tests.
- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-command-recovery.test.ts tests/cli-help.test.ts tests/api-hook.test.ts --reporter=verbose` passed: 4 files, 176 tests.
- `npm test -- --run` passed: 49 files, 646 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 45 pure LOC.
  - `tests/cli-command-recovery-extra.test.ts`: 33 pure LOC.
  - `tests/cli-command-recovery.test.ts`: 25 pure LOC.
  - `src/cli/index.ts`: 2942 pure LOC, inherited oversized defect; reduced again by this slice, but still needs continued extraction.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting cohesive command validation/data tables in separate behavior-locked slices.
- Keep command recovery helpers pure and below the 250 pure LOC ceiling.
