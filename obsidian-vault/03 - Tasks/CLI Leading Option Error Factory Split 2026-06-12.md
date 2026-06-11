---
title: CLI Leading Option Error Factory Split 2026-06-12
aliases:
  - CLI leading option error helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Leading Option Error Factory Split 2026-06-12

## Result

Leading option `Error` construction now lives in `src/cli/leading-option-error.ts` instead of the oversized CLI entrypoint.

## Scope

- Added `leadingOptionError` as a focused wrapper around the existing command-first recovery message.
- Added `tests/leading-option-error.test.ts` to lock the `Error` surface, reordered command suggestion, and help hint.
- Updated `src/cli/index.ts` to call the helper directly for leading options.

## Verification

- Red test first: `npx vitest run tests/leading-option-error.test.ts --reporter=verbose` failed before implementation because the module did not exist.
- `npm run build` passed.
- Focused Vitest passed: `npx vitest run tests/leading-option-error.test.ts tests/cli-leading-option-recovery.test.ts tests/cli-help.test.ts --reporter=verbose` — 42 tests.
- CLI smoke passed:
  - `node dist/cli/index.js --json status` returned exit 1 JSON recovery with `Use: agentfeed status --json`.
  - `node dist/cli/index.js --source codex share` returned exit 1 with `Use: agentfeed share --source codex`.
- Full suite passed: `npm test -- --run` — 61 files, 685 tests.
- `git diff --check` passed.
- Strict grep passed for touched TS/test files.
- LSP diagnostics were not available because `typescript-language-server` is not installed in this environment; install was not requested.

## Size review

- `src/cli/index.ts`: 2827 pure LOC; still an inherited oversized defect, but this slice reduced it by 8 pure LOC while moving a cohesive recovery factory out.
- `src/cli/leading-option-error.ts`: 5 pure LOC.
- `tests/leading-option-error.test.ts`: 18 pure LOC.

## Constraints honored

- No server, deploy, infra, or CI/CD work.
- No CLI/frontend/backend contract change.
- No new product feature; internal parser/recovery boundary quality only.
- Work documented for the active enterprise-readiness loop.

## Follow-up

> [!todo]
> Continue removing entrypoint-local recovery factories or parser branches only when the extraction keeps public CLI wording behavior-locked and reduces `src/cli/index.ts`.
