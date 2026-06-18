---
title: Frontend Read Side Strict Field Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - read-side
  - enterprise-readiness
status: done
---

# Frontend Read Side Strict Field Fixture Split 2026-06-18

## Context

The post-API-surface fixture split re-scan showed `agentfeed-frontend/src/lib/read-side-strict-fields.contract.test.ts` as the largest remaining contract test at 47 pure LOC. It still owned activity/integration valid payload fixtures, strict-field rejection helper, and extra-field rejection assertions directly in the runner.

## Changed

- Added `src/lib/read-side-strict-fields-fixtures.ts` for activity/integration valid payload fixtures, strict-field rejection helper, valid payload assertions, and extra-field rejection assertions.
- Reduced `src/lib/read-side-strict-fields.contract.test.ts` to invoking `assertReadSideStrictFieldContracts()`.
- Preserved existing activity and integration status strict-field contract behavior without runtime app changes.
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
  - `src/lib/read-side-strict-fields.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/read-side-strict-fields-fixtures.ts`: 64 lines / 55 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `296fc6e` — `Split read side strict field fixtures`

## Follow-up

- Keep read-side strict-field payload fixtures and assertions in `read-side-strict-fields-fixtures.ts`.
- [x] Remaining next re-scan candidate `api-pagination-request-contracts.contract.test.ts` handled in [[Frontend API Pagination Request Fixture Split 2026-06-18]]. Tied candidate `worklog-metric-evidence.contract.test.ts` handled in [[Frontend Worklog Metric Evidence Fixture Split 2026-06-18]]. Current next re-scan candidate: `project-schema-variants-strict-fields.contract.test.ts` at 45 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
