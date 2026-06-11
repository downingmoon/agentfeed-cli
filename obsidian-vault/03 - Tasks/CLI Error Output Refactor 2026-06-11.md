---
title: CLI Error Output Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Error Output Refactor 2026-06-11

## Result

Extracted CLI JSON error shaping from the oversized entrypoint into `src/cli/error-output.ts`.

## Changed

- `src/cli/error-output.ts`
  - Owns `errorCodeFromMessage`, `jsonErrorFromMessage`, and the readonly `CliJsonErrorOutput` type.
  - Preserves existing command extraction from `Run:`, `Use:`, and `Try:` lines plus suggestion extraction from `Did you mean:` lines.
- `src/cli/index.ts`
  - Imports `jsonErrorFromMessage` and keeps only top-level command error handling.
- `tests/cli-error-output.test.ts`
  - Adds focused coverage for stable error-code derivation, detail preservation, next-action dedupe, suggestion dedupe, and blank-message fallback.

## Verification

- Red check: `npx vitest run tests/cli-error-output.test.ts --reporter=verbose` failed first because `src/cli/error-output.js` did not exist.
- `npm run build` passed.
- `npx vitest run tests/cli-error-output.test.ts tests/cli-help.test.ts tests/cli-preview.test.ts --reporter=verbose` passed: 3 files, 54 tests.
- `npm test -- --run` passed: 46 files, 637 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for changed TS files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/error-output.ts`: 36 pure LOC.
  - `tests/cli-error-output.test.ts`: 47 pure LOC.
  - `src/cli/index.ts`: 3023 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because the TypeScript LSP server is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting cohesive non-side-effect helpers.
- Candidate: command suggestion/recovery parsing near the bottom of the entrypoint, after adding focused tests for typo and command-first guidance.
