---
title: CLI Token Rotate Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Token Rotate Recovery Refactor 2026-06-11

## Result

`agentfeed token rotate <extra>`의 unexpected positional recovery 메시지를 `src/cli/command-recovery.ts`의 `tokenRotateUnexpectedArgumentMessage`로 분리했다. token alias validation은 flagless option suggestion 계산만 담당하고, message assembly는 recovery helper로 위임한다.

## Changed

- `src/cli/command-recovery.ts`
  - Added `tokenRotateUnexpectedArgumentMessage` with optional suggestion lines.
- `src/cli/index.ts`
  - Replaced inline multi-line `commandUsageError` assembly in `token` positional validation.
- `tests/cli-command-recovery-extra.test.ts`
  - Locks suggested flag output for `token rotate browser`.

## Verification

- Red test confirmed first: helper import failed with `tokenRotateUnexpectedArgumentMessage is not a function`.
- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 2 files, 48 tests.
- CLI surface smoke passed: `node dist/cli/index.js token rotate browser` exited 1 and printed the expected unexpected-argument message, `--browser` suggestion, and token rotate help hint.
- `npm test -- --run` passed: 50 files, 658 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 126 pure LOC.
  - `tests/cli-command-recovery-extra.test.ts`: 104 pure LOC.
  - `src/cli/index.ts`: 2849 pure LOC, inherited oversized defect; this slice reduced inline token recovery assembly.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Boundary / Operations

- No server, deploy, infra, or CI/CD work was performed in this slice.
- CLI-Frontend-Backend contract surface was not changed.

## Remaining Follow-up

- Continue extracting command recovery presentation from `src/cli/index.ts` with behavior-locked tests.
- Candidate: bare `--` command argument recovery.
