---
title: CLI Draft Creation Redaction Boundary Guard
date: 2026-06-10
tags:
  - agentfeed/cli
  - task/security
  - task/contract
status: done
---

# CLI Draft Creation Redaction Boundary Guard

## Context

`src/draft/create.ts` creates local AgentFeed drafts after scanning public fields. The previous implementation extracted redacted values with broad TypeScript assertions such as `as string[]`, `as string | null`, and `as LocalDraft['worklog']['timeline']`.

Because draft creation is the first durable local artifact boundary, malformed redaction output should fail with an explicit boundary error instead of being coerced into the draft shape.

## 변경 사항

- Added `src/draft/redacted-draft-fields.ts`.
- Reused the existing strict `parseRedactedPatch` boundary from `src/privacy/redacted-public-fields.ts`.
- Added `parseRequiredRedactedDraftFields` so draft creation rejects missing required public fields explicitly.
- Updated both `createEmptyDraft` and `collectDraftWithStatus` to use parsed redacted fields instead of direct assertions.
- Added `tests/draft-redacted-fields.test.ts` to lock the missing required field error:
  - `Redacted public draft fields missing project.`

## Verification

- Red test first: `npm test -- --run tests/draft-redacted-fields.test.ts` failed because the helper did not exist.
- `npm test -- --run tests/draft-redacted-fields.test.ts` → 1 passed.
- `npm test -- --run tests/draft-redacted-fields.test.ts tests/privacy.test.ts tests/git-draft.test.ts` → 72 passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `npm test -- --run` → 29 files, 593 tests passed.
- Assertion scan for draft creation redacted fields showed no remaining `redacted.* as string[]`, `as string | null`, `as LocalDraft['worklog']['timeline']`, or `as { name: string }` in `src/draft/create.ts`.
- Changed helper LOC:
  - `src/draft/redacted-draft-fields.ts` → 34 pure LOC.
  - `tests/draft-redacted-fields.test.ts` → 18 pure LOC.
- LSP diagnostics could not run because `typescript-language-server` is not installed locally. `tsc --noEmit` was used as type evidence.

## Follow-up

> [!todo]
> `src/privacy/scan.ts` still contains internal implementation assertions and a mutable `any` in `setDeep`. That is a lower-level scanner implementation risk and should be handled in a focused pass with regression tests around nested array/object redaction.

> [!todo]
> `src/draft/validation.ts` returns `root as unknown as LocalDraft` after runtime validation. It should eventually construct a typed `LocalDraft` output instead of asserting, but that requires a separate validation refactor.
