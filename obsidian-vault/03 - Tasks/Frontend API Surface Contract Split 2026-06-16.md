---
title: Frontend API Surface Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - api-surface
  - enterprise-readiness
status: done
---

# Frontend API Surface Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed direct worklog mutation body shape, route-client availability checks, search type coverage, and settings token shape smoke tests into the broad API omnibus contract file. These are frontend API client surface contracts and should be reviewable without unrelated parser/adapter assertions.

## Changed

- Moved existing direct worklog body and API surface assertions into `src/lib/api-surface-contracts.contract.test.ts`. 2026-06-18 follow-up moved those assertions into [[Frontend API Surface Fixture Split 2026-06-18]].
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused API surface imports and 56 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - direct worklog mutation uses canonical backend ingest agent/category values.
  - worklogs unpublish, search query, paginated user projects, ingestion token lifecycle, profile/username mutations, and social report methods remain exposed by the frontend client.
  - search query types include `prompts`.
  - settings ingestion token rows retain the expected frontend shape.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 581 lines / 509 pure LOC
  - `src/lib/api-surface-contracts.contract.test.ts`: 56 lines / 47 pure LOC at split time; 2026-06-18 follow-up reduced it to 3 lines / 2 pure LOC.
  - `scripts/run-contract-tests.mjs`: 157 lines / 148 pure LOC

## Follow-up

- Continue splitting remaining `api-contract.test.ts` clusters: auth.me normalization and review action guards.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
