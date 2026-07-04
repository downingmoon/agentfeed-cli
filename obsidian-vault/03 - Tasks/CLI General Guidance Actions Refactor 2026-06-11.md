---
title: CLI General Guidance Actions Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI General Guidance Actions Refactor 2026-06-11

## Result

Extracted remaining general-purpose CLI next-action guidance from the oversized entrypoint into `src/cli/guidance-actions.ts`.

## Changed

- `src/cli/guidance-actions.ts`
  - Owns privacy scan, initialization, and command catalog follow-up action calculations.
  - Exposes narrow readonly option types for privacy scan guidance.
- `src/cli/index.ts`
  - Imports the extracted pure guidance helpers while keeping command orchestration and rendering local.
- `tests/cli-guidance-actions.test.ts`
  - Adds focused coverage for privacy scan targets/modes, init existing/new states, and command catalog onboarding actions.

## Verification

- Red check: `npx vitest run tests/cli-guidance-actions.test.ts --reporter=verbose` failed first because `src/cli/guidance-actions.js` did not exist.
- `npm run build` passed.
- `npx vitest run tests/cli-guidance-actions.test.ts tests/cli-init-setup-ux.test.ts tests/cli-scan.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 4 files, 62 tests.
- `npm test -- --run` passed: 45 files, 634 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for changed TS files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/guidance-actions.ts`: 28 pure LOC.
  - `tests/cli-guidance-actions.test.ts`: 44 pure LOC.
  - `src/cli/index.ts`: 3053 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because the TypeScript LSP server is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting cohesive non-side-effect helpers.
- Candidate: JSON error shaping and suggestion/recovery parsing near the top of the entrypoint, after adding focused tests.
