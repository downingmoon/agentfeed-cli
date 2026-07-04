---
title: CLI Completion Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Completion Recovery Refactor 2026-06-11

## Result

Extracted unsupported shell recovery message formatting for `agentfeed completion` from the oversized CLI entrypoint into `src/cli/command-recovery.ts`.

## Changed

- `src/cli/command-recovery.ts`
  - Added `unsupportedCompletionShellMessage`.
  - Keeps supported-shell list formatting and closest shell typo suggestions in a focused pure helper.
- `src/cli/index.ts`
  - Keeps completion positional validation local.
  - Delegates unsupported shell recovery text to `command-recovery.ts`.
- `tests/cli-command-recovery-extra.test.ts`
  - Locks typo suggestion behavior for `zhs -> zsh` and no-suggestion behavior for `powershell`.

## Verification

- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 2 files, 42 tests.
- `npm test -- --run` passed: 50 files, 652 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 71 pure LOC.
  - `tests/cli-command-recovery-extra.test.ts`: 46 pure LOC.
  - `src/cli/index.ts`: 2876 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Operational Note

- Disk free space fell to ~1.3GiB after full test/build verification. Next large test/build slice may need cache cleanup before running.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` with behavior-locked slices.
- Candidate: flagless positional option suggestion extraction.
