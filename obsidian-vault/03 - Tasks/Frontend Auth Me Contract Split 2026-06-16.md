---
title: Frontend Auth Me Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - enterprise-readiness
status: done
---

# Frontend Auth Me Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed `auth.me` payload normalization checks into the broad API omnibus contract file. The authenticated user payload is a sensitive cross-repo contract because AppContext and signed-in surfaces rely on strict identity normalization and fail-closed behavior.

## Changed

- Moved existing `normalizeAuthMe` assertions into `src/lib/auth-me-contracts.contract.test.ts`. 2026-06-18 follow-up moved the payload fixtures and assertion flow into [[Frontend Auth Me Fixture Split 2026-06-18]].
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused auth normalizer import and 53 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - `auth.me` trims user identity/profile strings before AppContext consumption.
  - empty optional profile URL/avatar values normalize to `null`.
  - username-only identity payloads fail closed.
  - blank authenticated user IDs fail closed with an auth.me response contract mismatch.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 529 lines / 460 pure LOC
  - `src/lib/auth-me-contracts.contract.test.ts`: 53 lines / 50 pure LOC at split time; 2026-06-18 follow-up reduced it to 3 lines / 2 pure LOC.
  - `scripts/run-contract-tests.mjs`: 158 lines / 149 pure LOC

## Follow-up

- Continue splitting remaining `api-contract.test.ts` clusters: review action/preview privacy guards, public user/leaderboard parser guards, and API error/display behavior.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
