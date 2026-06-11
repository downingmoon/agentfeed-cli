---
title: CLI Completion Positional Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Completion Positional Recovery Refactor 2026-06-11

## Result

`agentfeed completion <shell> <extra>`의 unexpected positional recovery 메시지를 `src/cli/command-recovery.ts`의 `completionUnexpectedArgumentMessage`로 분리했다. completion generator fallback도 같은 supported-shell helper를 재사용해 validation/generator의 recovery wording drift를 줄였다.

## Changed

- `src/cli/command-recovery.ts`
  - Added `completionUnexpectedArgumentMessage` for completion-specific unexpected positional formatting.
- `src/cli/index.ts`
  - Shared `SUPPORTED_COMPLETION_SHELLS` between `completionScript` fallback and completion positional validation.
  - Delegated unexpected completion positional recovery text to `command-recovery.ts`.
- `tests/cli-command-recovery-extra.test.ts`
  - Locks `completionUnexpectedArgumentMessage('extra')` output.

## Verification

- `npm run build` passed.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 2 files, 47 tests.
- CLI surface smoke passed: `node dist/cli/index.js completion zsh extra` exited 1 and printed `Unexpected argument for completion: extra` plus `Run: agentfeed completion --help`.
- `npm test -- --run` passed: 50 files, 657 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/command-recovery.ts`: 123 pure LOC.
  - `tests/cli-command-recovery-extra.test.ts`: 97 pure LOC.
  - `src/cli/index.ts`: 2850 pure LOC, inherited oversized defect; this slice reduces duplicate completion recovery wording without adding net entrypoint scope.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Boundary / Operations

- No server, deploy, infra, or CI/CD work was performed in this slice.
- CLI-Frontend-Backend contract surface was not changed.

## Remaining Follow-up

- Continue behavior-locked recovery extraction before larger command-spec module splits.
- Keep reducing `src/cli/index.ts` through narrow, tested slices.
