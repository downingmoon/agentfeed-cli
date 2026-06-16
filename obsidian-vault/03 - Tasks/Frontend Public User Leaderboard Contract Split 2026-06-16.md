---
title: Frontend Public User Leaderboard Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - user
  - leaderboard
  - enterprise-readiness
status: done
---

# Frontend Public User Leaderboard Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed public user parser guards and leaderboard row guards into the broad API omnibus contract file. These checks protect public profile/leaderboard rendering from Backend response drift and private/debug field leakage, so they should be isolated as a focused response parser contract surface.

## Changed

- Moved existing `normalizeUserPublic`, `safeLeaderboardItems`, and `leaderboardUserKey` assertions into `src/lib/public-user-leaderboard-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused public user/leaderboard imports and 125 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - public user parser rejects unexpected user fields before public profile rendering.
  - leaderboard adapter preserves valid rows and rejects malformed rows instead of silently dropping them.
  - nested private/debug fields in user stats or metrics fail closed.
  - public stats map Backend public aggregate fields without raw aggregate fallbacks.
  - missing stats normalize to safe zero/null defaults while malformed numeric stats fail closed.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 255 lines / 218 pure LOC
  - `src/lib/public-user-leaderboard-contracts.contract.test.ts`: 125 lines / 118 pure LOC
  - `scripts/run-contract-tests.mjs`: 160 lines / 151 pure LOC

## Follow-up

- [x] Notification/path/external URL helpers were split in [[Frontend Notification URL Contract Split 2026-06-16]].
- Continue splitting remaining `api-contract.test.ts` clusters: API error/display behavior, theme/auth-action/social-action helpers, and list envelope fallback checks.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
