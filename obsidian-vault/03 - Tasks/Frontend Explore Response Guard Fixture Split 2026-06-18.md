---
title: Frontend Explore Response Guard Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - explore
  - enterprise-readiness
status: done
---

# Frontend Explore Response Guard Fixture Split 2026-06-18

## Context

The post-security-header contract size re-scan showed `agentfeed-frontend/src/lib/explore-response-guards.contract.test.ts` tied for largest remaining contract test at 60 pure LOC. The shared `search-explore-response-fixtures.ts` was already 136 pure LOC, so this work created a focused explore response guard fixture module instead of growing the shared search/explore fixture.

## Changed

- Split valid explore section preservation, malformed nested worklog/project/prompt/builder/category cases, JSON response helper, fail-closed ApiError assertion, and fetch restore runner into `src/lib/explore-response-guard-fixtures.ts`.
- Reduced `src/lib/explore-response-guards.contract.test.ts` to invoking `assertExploreResponseGuardContracts()` with the existing contract-test async failure handler.
- Preserved existing explore response guard behavior without runtime app changes.
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
  - `src/lib/explore-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/explore-response-guard-fixtures.ts`: 69 lines / 62 pure LOC
  - `src/lib/search-explore-response-fixtures.ts`: unchanged at 147 lines / 136 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `e4a67e6` — `Split explore response guard fixtures`

## Follow-up

- Keep explore response guard cases in `explore-response-guard-fixtures.ts`.
- Keep checking `search-explore-response-fixtures.ts` before adding cases; current size is 136 pure LOC.
- Remaining next re-scan candidate: `remaining-read-response-guards.contract.test.ts` at 60 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
