---
title: Frontend Moderation Report Contract Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - moderation
  - enterprise-readiness
status: done
---

# Frontend Moderation Report Contract Fixture Split 2026-06-17

## Context

After the API response auth event helper move, the next contract size re-scan showed `agentfeed-frontend/src/lib/moderation-report-contracts.contract.test.ts` as the largest frontend contract file at 79 pure LOC. Request recording, JSON response construction, moderation report response fixtures, and recorded-request assertions were still inline in the contract test.

## Changed

- Added `src/lib/moderation-report-contract-fixtures.ts` for moderation report request records, JSON response construction, backend report response fixtures, recorded-request assertions, and fetch recorder installation/restoration.
- Kept `src/lib/moderation-report-contracts.contract.test.ts` focused on exercising list/status-update client calls and verifying request method/path/query/body contracts. 2026-06-19 [[Frontend Moderation Report Contract Assertion Move 2026-06-19]] moved that runner-owned assertion flow into `src/lib/moderation-report-contract-assertions.ts`.
- Preserved existing moderation report API contract behavior without runtime app changes.
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
  - `src/lib/moderation-report-contracts.contract.test.ts`: originally 46 lines / 40 pure LOC; 2026-06-19 split result is 6 lines / 5 pure LOC runner plus 49 lines / 43 pure LOC assertion helper
  - `src/lib/moderation-report-contract-fixtures.ts`: 59 lines / 54 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d0fe32d` — `Split moderation report contract fixtures`

## Follow-up

- Keep moderation report request/response contract fixtures in `moderation-report-contract-fixtures.ts`.
- Re-scan found `worklog-detail-adapter.contract.test.ts` tied as the largest contract file and split fixtures in [[Frontend Worklog Detail Adapter Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
