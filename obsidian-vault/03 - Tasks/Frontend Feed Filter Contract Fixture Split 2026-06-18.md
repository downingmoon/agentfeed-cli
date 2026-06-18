---
title: Frontend Feed Filter Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - feed
  - enterprise-readiness
status: done
---

# Frontend Feed Filter Contract Fixture Split 2026-06-18

## Context

The post-search-response contract size re-scan showed `agentfeed-frontend/src/lib/feed-filter-contracts.contract.test.ts` tied for largest remaining contract test at 62 pure LOC.

## Changed

- Split backend sort/time coverage checks, sort label/param assertions, time label/param assertions, scope/query serialization assertions, and tag normalization checks into `src/lib/feed-filter-contract-fixtures.ts`.
- Reduced `src/lib/feed-filter-contracts.contract.test.ts` to invoking `assertFeedFilterContracts()`.
- Preserved existing feed filter contract behavior without runtime app changes.
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
  - `src/lib/feed-filter-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/feed-filter-contract-fixtures.ts`: 99 lines / 79 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `8b631a9` — `Split feed filter contract fixtures`

## Follow-up

- Keep feed filter contract cases in `feed-filter-contract-fixtures.ts`.
- Next re-scan candidate: `api-response-envelope-hardening.contract.test.ts` at 62 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
