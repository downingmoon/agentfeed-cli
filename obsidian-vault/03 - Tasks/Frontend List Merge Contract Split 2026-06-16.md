---
title: Frontend List Merge Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - pagination
  - enterprise-readiness
status: done
---

# Frontend List Merge Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed pagination merge and project result key checks into the broad API omnibus contract file. These checks protect cursor-page append behavior and search/project duplicate handling, so they should be reviewable as a focused list contract surface.

## Changed

- Moved existing `uniqueBy`, `appendUniqueBy`, and `projectResultKey` assertions into `src/lib/list-merge-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused list/project key imports and 43 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - dedupe preserves first-seen order.
  - cursor-page append drops duplicates from existing rows and within an incoming page.
  - project pagination uses slug with name fallback.
  - search project merge keys include owner username so duplicate slugs from different owners are not collapsed.
  - missing route slugs fall back to stable project IDs.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 715 lines / 616 pure LOC
  - `src/lib/list-merge-contracts.contract.test.ts`: 43 lines / 36 pure LOC
  - `scripts/run-contract-tests.mjs`: 155 lines / 146 pure LOC

## Follow-up

- Continue splitting remaining `api-contract.test.ts` clusters: direct worklog body/API surface checks, auth.me normalization, feed filters, and review action guards.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
