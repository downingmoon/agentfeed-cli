---
title: CLI Closest Match Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Closest Match Refactor 2026-06-11

## Result

Extracted CLI typo matching from the oversized entrypoint into `src/cli/closest-match.ts`.

## Changed

- `src/cli/closest-match.ts`
  - Owns edit-distance calculation, shared-prefix tie breaking, and `closestMatch` thresholding.
- `src/cli/index.ts`
  - Imports `closestMatch` for command, help topic, option, and completion suggestions.
- `tests/cli-closest-match.test.ts`
  - Adds focused coverage for close command typos, shared-prefix tie breaking, distant candidates, and empty candidate lists.

## Verification

- Red check: `npx vitest run tests/cli-closest-match.test.ts --reporter=verbose` failed first because `src/cli/closest-match.js` did not exist.
- `npm run build` passed.
- `npx vitest run tests/cli-closest-match.test.ts tests/cli-help.test.ts tests/cli-collect.test.ts --reporter=verbose` passed: 3 files, 64 tests.
- `npm test -- --run` passed: 47 files, 640 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for changed TS files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/closest-match.ts`: 40 pure LOC.
  - `tests/cli-closest-match.test.ts`: 15 pure LOC.
  - `src/cli/index.ts`: 2984 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because the TypeScript LSP server is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting command usage/recovery helpers in smaller pieces.
- Candidate: `commandHelpHint`, `commandUsageError`, and conflict/flagless suggestion helpers, after focused tests are added.
