---
title: CLI Privacy Scanner Nested Redaction Guard
date: 2026-06-10
tags:
  - agentfeed/cli
  - task/security
  - task/refactor
status: done
---

# CLI Privacy Scanner Nested Redaction Guard

## Context

`src/privacy/scan.ts` is the low-level scanner that redacts public upload fields. Its internal `setDeep` path updater previously used `any`, `as ScanInput`, `as T`, and non-null assertions while writing redacted values back into nested arrays/objects.

Because this scanner feeds CLI draft creation, scan, and publish flows, nested redaction must stay deterministic without unsafe TypeScript escape hatches.

## 변경 사항

- Added a nested array/object redaction regression in `tests/privacy.test.ts`.
- Replaced the `setDeep` implementation with typed `RedactionContainer` helpers.
- Removed scanner-local `any`, `as ScanInput`, `as T`, and `parts.at(-1)!` non-null assertions.
- Kept scanner behavior unchanged: nested values are redacted in place while sibling numeric/string fields remain intact.

## Verification

- `npm test -- --run tests/privacy.test.ts` → 49 passed.
- `npm run typecheck` → passed.
- Static scan for `any`, `as any`, `as unknown`, `as ScanInput`, `as T`, `@ts-ignore`, `@ts-expect-error`, and non-null path patterns in `src/privacy/scan.ts` / `tests/privacy.test.ts` → no matches.
- `npm run build` → passed.
- `npm test -- --run` → 29 files, 594 tests passed.
- Changed-file LOC:
  - `src/privacy/scan.ts` → 124 pure LOC.
  - `tests/privacy.test.ts` → 185 pure LOC.
- LSP diagnostics could not run because `typescript-language-server` is not installed locally. `tsc --noEmit` was used as type evidence.

## Follow-up

> [!todo]
> `src/draft/validation.ts` still returns `root as unknown as LocalDraft` after runtime validation. It should be handled in a separate typed reconstruction pass because it affects the broader local draft read boundary.

> [!todo]
> Large pre-existing files remain: `src/cli/index.ts`, `src/api/client.ts`, and `src/draft/create.ts`. Split only when touching a cohesive area, with regression tests first.
