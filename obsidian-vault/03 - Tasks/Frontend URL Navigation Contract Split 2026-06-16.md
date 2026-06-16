---
title: Frontend URL Navigation Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - navigation
  - enterprise-readiness
status: done
---

# Frontend URL Navigation Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed review-origin normalization, worklog/project/dashboard URL builders, and share permalink checks into the broad API omnibus contract file. These checks protect CLI-Backend-Frontend handoff URLs and review links, so they should be isolated as a focused navigation contract surface.

## Changed

- Moved existing URL/navigation assertions into `src/lib/url-navigation-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused navigation imports and 87 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - `review_base_url` is canonicalized and rejects unsafe path/query/userinfo/public HTTP origins except explicit local/server-test cases.
  - worklog detail/review URLs encode IDs and apply trusted review origins.
  - project routes encode owner/slug and preserve legacy owner-missing routing.
  - dashboard recent worklog action URLs reject unsafe external action URLs and fall back by status.
  - worklog share permalinks normalize origin and encode worklog IDs.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅ after removing one trailing blank line found by the first diff check.
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 758 lines / 652 pure LOC
  - `src/lib/url-navigation-contracts.contract.test.ts`: 87 lines / 67 pure LOC
  - `scripts/run-contract-tests.mjs`: 154 lines / 145 pure LOC

## Follow-up

- Continue splitting remaining `api-contract.test.ts` clusters: list merge, direct worklog body/API surface checks, auth.me normalization, feed filters, and review action guards.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
