---
title: Frontend Feed Filter Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - feed
  - enterprise-readiness
status: done
---

# Frontend Feed Filter Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed feed sort/time/scope/tag URL contract checks into the broad API omnibus contract file. Feed filtering is a CLI-Backend-Frontend discovery contract because UI labels must map to backend query params and stable shareable URLs.

## Changed

- Moved existing feed sort/time/scope/tag assertions into `src/lib/feed-filter-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused feed filter imports and 81 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - `most_discussed` is labeled as `Most discussed`, not `Most shipped`.
  - feed time labels map to backend `today/week/month/all` values.
  - URL params normalize unknown sort/time/scope values to safe defaults.
  - non-default filters serialize into stable query strings and default filters are omitted.
  - Explore tag links normalize user-facing hash/tag text safely.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 635 lines / 555 pure LOC
  - `src/lib/feed-filter-contracts.contract.test.ts`: 81 lines / 62 pure LOC
  - `scripts/run-contract-tests.mjs`: 156 lines / 147 pure LOC

## Follow-up


- 2026-06-19: feed filter keyboard source-contract assertion orchestration은 [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]에서 `feed-filter-keyboard-assertions.ts`로 이동했고 focused runner는 2 pure LOC로 축소했다.
- Continue splitting remaining `api-contract.test.ts` clusters: direct worklog body/API surface checks, auth.me normalization, and review action guards.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
