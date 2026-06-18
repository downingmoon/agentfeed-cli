---
title: Frontend Remaining Read Malformed Response Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api
  - enterprise-readiness
status: done
---

# Frontend Remaining Read Malformed Response Fixture Split 2026-06-18

## Context

The post-CLI-authorize-session contract size re-scan showed `agentfeed-frontend/src/lib/remaining-read-malformed-response-guards.contract.test.ts` as the largest remaining contract test at 65 pure LOC.

## Changed

- Split moderation, dashboard, notification, activity, suggestion, and tag malformed read response cases plus the fail-closed fetch runner into `src/lib/remaining-read-malformed-response-fixtures.ts`.
- Reduced `src/lib/remaining-read-malformed-response-guards.contract.test.ts` to invoking `assertRemainingReadMalformedResponseContracts()` with the existing contract-test async failure handler.
- Preserved existing remaining read malformed response guard contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/remaining-read-malformed-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/remaining-read-malformed-response-fixtures.ts`: 73 lines / 68 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4ff913f` — `Split remaining read malformed response fixtures`

## Follow-up

- Keep remaining read malformed response cases in `remaining-read-malformed-response-fixtures.ts`.
- Next re-scan candidate from latest scan should be documented in the central log after the final scan.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
