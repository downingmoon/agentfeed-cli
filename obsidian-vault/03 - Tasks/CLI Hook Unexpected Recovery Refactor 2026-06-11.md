---
title: CLI Hook Unexpected Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Hook Unexpected Recovery Refactor 2026-06-11

## Result

`legacy hook extra-argument case (deprecated)`의 unexpected positional recovery 메시지를 `src/cli/command-recovery.ts`의 `hookUnexpectedArgumentMessage`로 분리했다. hook positional validation은 arity/action/target 판정만 남기고, recovery message assembly는 focused helper가 담당한다.

## Changed

- `src/cli/command-recovery.ts`
  - Added `hookUnexpectedArgumentMessage`.
- `src/cli/index.ts`
  - Replaced inline hook unexpected-argument `commandUsageError` assembly with the helper.
- `tests/cli-command-recovery-extra.test.ts`
  - Locks helper output for extra hook positionals.

## Verification

- Red test confirmed first: helper import failed with `hookUnexpectedArgumentMessage is not a function`.
- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 2 files, 49 tests.
- CLI surface smoke passed: `node dist/cli/index.js legacy hook setup claude-code extra` exited 1 and printed `Unexpected argument for hook: extra` plus `Run: agentfeed hook --help`.
- `npm test -- --run` passed: 50 files, 659 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 129 pure LOC.
  - `tests/cli-command-recovery-extra.test.ts`: 110 pure LOC.
  - `src/cli/index.ts`: 2849 pure LOC, inherited oversized defect; this slice reduced inline hook recovery assembly without adding entrypoint scope.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Boundary / Operations

- No server, deploy, infra, or CI/CD work was performed in this slice.
- CLI-Frontend-Backend contract surface was not changed.

## Remaining Follow-up

- Continue extracting command recovery presentation from `src/cli/index.ts` with behavior-locked tests.
- Candidate: bare `--` argument recovery and value-option missing-value recovery.
