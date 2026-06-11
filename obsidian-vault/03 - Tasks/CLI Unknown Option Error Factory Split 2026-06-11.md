---
title: CLI Unknown Option Error Factory Split 2026-06-11
aliases:
  - CLI unknown option error helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-11
---

# CLI Unknown Option Error Factory Split 2026-06-11

## Result

Unknown option `Error` construction now lives in `src/cli/unknown-option-error.ts` instead of the oversized CLI entrypoint.

## Scope

- Added `unknownOptionError` as a focused helper that formats command option recovery from parser option specs.
- Added `tests/unknown-option-error.test.ts` to lock the recovery message, closest suggestion, and command help hint.
- Updated `src/cli/index.ts` to consume the helper for both long and short unknown option paths.

## Verification

- Red test first: `npx vitest run tests/unknown-option-error.test.ts --reporter=verbose` failed before implementation because the module did not exist.
- `npm run build` passed.
- Focused Vitest passed: `npx vitest run tests/unknown-option-error.test.ts tests/long-option-consumption.test.ts tests/cli-help.test.ts --reporter=verbose` — 41 tests.
- CLI smoke passed:
  - `node dist/cli/index.js share --opne-review` returned exit 1 with `Did you mean: --open-review`.
  - `node dist/cli/index.js status -x` returned exit 1 with `Did you mean: -h`.
- Full suite passed: `npm test -- --run` — 59 files, 683 tests.
- `git diff --check` passed.
- Strict grep passed for touched TS/test files.
- LSP diagnostics were not available because `typescript-language-server` is not installed in this environment.

## Size review

- `src/cli/index.ts`: 2837 pure LOC; still an inherited oversized defect, but this slice reduced it by 2 pure LOC while moving a cohesive recovery factory out.
- `src/cli/unknown-option-error.ts`: 18 pure LOC.
- `tests/unknown-option-error.test.ts`: 20 pure LOC.

## Constraints honored

- No server, deploy, infra, or CI/CD work.
- No CLI/frontend/backend contract change.
- No new product feature; internal parser boundary quality only.
- Work documented for the active enterprise-readiness loop.

## Follow-up

> [!todo]
> Continue extracting cohesive parser/recovery boundaries from `src/cli/index.ts` only when each extraction has a focused red test and keeps public CLI wording stable.
