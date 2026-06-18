---
title: Frontend Public User Strict Stats Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - public-user
  - enterprise-readiness
status: done
---

# Frontend Public User Strict Stats Fixture Split 2026-06-18

## Context

The post-worklog-card-adapter contract size re-scan showed `agentfeed-frontend/src/lib/public-user-strict-stats.contract.test.ts` as the largest frontend contract file at 75 pure LOC. The test still owned valid public-user strict stats payloads, malformed strict stats/viewer-state cases, the API response helper, and the fail-closed capture helper inline.

## Changed

- Split public user strict stats payload/case/helper data into `src/lib/public-user-strict-stats-fixtures.ts`.
- Kept `src/lib/public-user-strict-stats.contract.test.ts` focused on arranging `users.get`, checking `current_streak_days`, and iterating malformed strict public-user cases.
- Preserved existing strict PublicUser stats fail-closed behavior without runtime app changes.
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
  - `src/lib/public-user-strict-stats.contract.test.ts`: 25 lines / 22 pure LOC
  - `src/lib/public-user-strict-stats-fixtures.ts`: 59 lines / 55 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4487bbc` — `Split public user strict stats fixtures`

## Follow-up

- Keep public user strict stats fixtures and capture helper in `public-user-strict-stats-fixtures.ts`.
- Re-scan found `worklog-card-malformed-adapter.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Worklog Card Malformed Adapter Fixture Split 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
