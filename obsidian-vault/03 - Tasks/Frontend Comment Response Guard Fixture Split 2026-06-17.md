---
title: Frontend Comment Response Guard Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - comments
  - enterprise-readiness
status: done
---

# Frontend Comment Response Guard Fixture Split 2026-06-17

## Context

After the API error diagnostic fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/comment-response-guards.contract.test.ts` as the largest frontend contract file at 81 pure LOC. Comment author payloads, valid list response data, malformed response cases, and JSON response helpers were still inline in the contract test.

## Changed

- Added `src/lib/comment-response-guard-fixtures.ts` for the comment author fixture, valid comment fixture, valid paginated list response, malformed comment response cases, and JSON response helper.
- Kept `src/lib/comment-response-guards.contract.test.ts` focused on validating preserved comment list fields, public author metadata mapping, pagination, and fail-closed malformed response handling.
- Preserved existing comment response guard contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/comment-response-guards.contract.test.ts`: 39 lines / 36 pure LOC
  - `src/lib/comment-response-guard-fixtures.ts`: 56 lines / 51 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `0d8c7b1` — `Split comment response guard fixtures`

## Follow-up

- Keep comment response guard fixtures and malformed cases in `comment-response-guard-fixtures.ts`.
- Re-scan found `settings-profile-save.contract.test.ts` tied as the largest contract file and moved expectations in [[Frontend Settings Profile Save Expectation Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
