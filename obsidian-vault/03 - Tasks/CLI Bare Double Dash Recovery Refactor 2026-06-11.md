---
title: CLI Bare Double Dash Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Bare Double Dash Recovery Refactor 2026-06-11

## Result

Command parser에서 bare `--`가 들어올 때의 recovery 메시지를 `src/cli/command-recovery.ts`의 `bareDoubleDashArgumentMessage`로 분리했다. `validateCommandArgs`는 parser boundary 판정만 유지하고, command-specific help hint를 포함한 message assembly는 focused helper가 담당한다.

## Changed

- `src/cli/command-recovery.ts`
  - Added `bareDoubleDashArgumentMessage`.
- `src/cli/index.ts`
  - Replaced inline bare `--` `commandUsageError` assembly with the helper.
- `tests/cli-command-recovery-extra.test.ts`
  - Locks helper output for `status --` recovery.

## Verification

- Red test confirmed first: helper import failed with `bareDoubleDashArgumentMessage is not a function`.
- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 2 files, 50 tests.
- CLI surface smoke passed: `node dist/cli/index.js status --` exited 1 and printed `Unexpected argument for status: --` plus `Run: agentfeed status --help`.
- `npm test -- --run` passed: 50 files, 660 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 132 pure LOC.
  - `tests/cli-command-recovery-extra.test.ts`: 116 pure LOC.
  - `src/cli/index.ts`: 2849 pure LOC, inherited oversized defect; this slice reduced parser recovery message assembly without adding entrypoint scope.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Boundary / Operations

- No server, deploy, infra, or CI/CD work was performed in this slice.
- CLI-Frontend-Backend contract surface was not changed.

## Remaining Follow-up

- Continue extracting command recovery presentation from `src/cli/index.ts` with behavior-locked tests.
- Candidate: value-option missing-value and flag value-not-accepted recovery helpers.
