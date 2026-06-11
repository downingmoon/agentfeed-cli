---
title: CLI Leading Option Recovery Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Leading Option Recovery Refactor 2026-06-11

## Result

Extracted leading-option command-first recovery message formatting from the oversized CLI entrypoint into `src/cli/leading-option-recovery.ts`.

## Changed

- `src/cli/leading-option-recovery.ts`
  - Owns command-first recovery text for options placed before commands.
  - Preserves generic examples, later-command reorder suggestions, inline option values, and command-specific help hints.
- `src/cli/index.ts`
  - Keeps command detection and validation orchestration local.
  - Delegates only the pure leading-option message calculation to the new module.
- `tests/cli-leading-option-recovery.test.ts`
  - Locks no-command examples, reordered value-option guidance, and inline-value preservation.

## Verification

- `npx vitest run tests/cli-leading-option-recovery.test.ts tests/cli-help.test.ts --reporter=verbose` passed: 2 files, 41 tests.
- `npm run build` passed.
- `npx vitest run tests/cli-leading-option-recovery.test.ts tests/cli-help.test.ts tests/cli-command-recovery.test.ts tests/cli-command-recovery-extra.test.ts --reporter=verbose` passed: 4 files, 47 tests.
- `npm test -- --run` passed: 50 files, 649 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for touched TS/test files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/leading-option-recovery.ts`: 69 pure LOC.
  - `tests/cli-leading-option-recovery.test.ts`: 41 pure LOC.
  - `src/cli/index.ts`: 2893 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because `typescript-language-server` is not installed; `tsc` build is the typecheck evidence.

## Operational Note

- During this slice the machine hit `no space left on device` with only ~556MiB free. Regenerable local artifacts/caches were cleaned (`dist`, npm cache, selected tool caches), and final free space was ~3.5GiB before commit.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` with behavior-locked slices.
- Next safe candidates: unknown option/command error shaping or completion shell recovery, before attempting the broader `COMMAND_ARG_SPECS` extraction.
