---
title: CLI Long Option Unknown Recovery Laziness 2026-06-11
aliases:
  - CLI long option lazy unknown recovery
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-11
---

# CLI Long Option Unknown Recovery Laziness 2026-06-11

## Result

`consumeLongOption` now receives an unknown-option error factory instead of an already-created `Error`, so valid long-option paths do not construct unused recovery errors.

## Scope

- Changed `src/cli/long-option-consumption.ts` to call `unknownOptionError(optionName)` only after the option is classified as `unknown`.
- Changed `src/cli/index.ts` to pass a lazy recovery factory from `validateCommandArgs`.
- Updated `tests/long-option-consumption.test.ts` to lock both sides:
  - value/flag options leave unknown recovery uncalled;
  - unknown options call recovery with the classified option name.

## Verification

- Red test first: `npx vitest run tests/long-option-consumption.test.ts --reporter=verbose` failed before implementation on the unknown path.
- `npm run build` passed.
- Focused Vitest passed: `npx vitest run tests/long-option-consumption.test.ts tests/long-option-classification.test.ts tests/cli-help.test.ts --reporter=verbose` — 42 tests.
- CLI smoke passed:
  - `node dist/cli/index.js share --opne-review` returned exit 1 with `Did you mean: --open-review`.
  - `node dist/cli/index.js status --json=true` returned exit 1 with `--json does not accept a value.`
- Full suite passed: `npm test -- --run` — 58 files, 682 tests.
- `git diff --check` passed.
- Strict grep passed for touched TS/test files.
- LSP diagnostics were not available because `typescript-language-server` is not installed in this environment.

## Constraints honored

- No server, deploy, infra, or CI/CD work.
- No CLI/frontend/backend contract change.
- No new product feature; internal parser quality only.
- Work documented for the active enterprise-readiness loop.

## Follow-up

> [!todo]
> Continue shrinking the inherited oversized `src/cli/index.ts` parser boundary by extracting cohesive command-argument specification or validation branches only when behavior can be locked with focused red tests.
