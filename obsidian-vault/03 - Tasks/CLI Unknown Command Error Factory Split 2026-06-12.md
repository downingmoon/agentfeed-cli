---
title: CLI Unknown Command Error Factory Split 2026-06-12
aliases:
  - CLI unknown command error helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Unknown Command Error Factory Split 2026-06-12

## Result

Unknown command `Error` construction now lives in `src/cli/unknown-command-error.ts` instead of the oversized CLI entrypoint.

## Scope

- Added `unknownCommandError` as a focused helper that formats unknown-command recovery from known command candidates.
- Added `tests/unknown-command-error.test.ts` to lock the typo, closest command suggestion, and root help hint.
- Updated all `src/cli/index.ts` unknown-command paths to use the helper.

## Verification

- Red test first: `npx vitest run tests/unknown-command-error.test.ts --reporter=verbose` failed before implementation because the module did not exist.
- `npm run build` passed.
- Focused Vitest passed: `npx vitest run tests/unknown-command-error.test.ts tests/unknown-option-error.test.ts tests/cli-help.test.ts --reporter=verbose` — 40 tests.
- CLI smoke passed:
  - `node dist/cli/index.js statsu` returned exit 1 with `Did you mean: agentfeed status`.
  - `node dist/cli/index.js statsu --help` returned exit 1 with the same recovery path.
- Full suite passed: `npm test -- --run` — 60 files, 684 tests.
- `git diff --check` passed.
- Strict grep passed for touched TS/test files.
- LSP diagnostics were not available because `typescript-language-server` is not installed in this environment.

## Size review

- `src/cli/index.ts`: 2835 pure LOC; still an inherited oversized defect, but this slice reduced it by 2 pure LOC while moving a cohesive recovery factory out.
- `src/cli/unknown-command-error.ts`: 8 pure LOC.
- `tests/unknown-command-error.test.ts`: 15 pure LOC.

## Constraints honored

- No server, deploy, infra, or CI/CD work.
- No CLI/frontend/backend contract change.
- No new product feature; internal parser/recovery boundary quality only.
- Work documented for the active enterprise-readiness loop.

## Follow-up

> [!todo]
> Continue extracting focused error/recovery helpers from `src/cli/index.ts` only when each extraction reduces the entrypoint and keeps CLI wording behavior-locked.
