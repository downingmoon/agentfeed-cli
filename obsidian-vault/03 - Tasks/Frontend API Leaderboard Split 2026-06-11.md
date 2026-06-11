---
title: Frontend API Leaderboard Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Explore Split 2026-06-11]]"
  - "[[Frontend API Search Split 2026-06-11]]"
---

# Frontend API Leaderboard Split 2026-06-11

## Summary

Frontend leaderboard response parsing was extracted from `src/lib/api.ts` into `src/lib/api-leaderboard.ts` while preserving the public `@/lib/api` facade and `leaderboard.get()` client.

## Why

Leaderboard is a ranking and identity surface. It must fail closed on malformed ranking rows, metrics, viewer state, user identity, leaderboard type, and period values before pagination, profile links, and podium rows render.

## Changed

- Added `src/lib/api-leaderboard.ts`.
- Moved these focused contracts/parsers:
  - `LeaderboardType`
  - `LeaderboardPeriod`
  - `ApiLeaderboardItem`
  - `ApiLeaderboardResponse`
  - `ApiLeaderboardResult`
  - `normalizeLeaderboardResult`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract guards for leaderboard user parsing, closed type/period unions, and enum validation to the new module.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm test
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  AGENTFEED_ALLOW_LOCAL_API_BUILD=1 \
  AGENTFEED_SKIP_PROD_API_COMPAT=1 \
  npm run build
```

Evidence:

- `npm run lint` passed via `tsc --noEmit`.
- `npm test` passed via `scripts/run-contract-tests.mjs`.
- Next.js production build passed with local DNS-less API override.
- New module size: `src/lib/api-leaderboard.ts` is 104 pure LOC.
- `src/lib/api.ts` shrank from 896 to 798 pure LOC in this slice, but remains oversized as an inherited facade.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `317ea21 Isolate frontend leaderboard contracts`

## Remaining follow-up

> [!todo]
> Continue reducing `src/lib/api.ts`; likely next isolated surfaces are moderation/comment and auth/settings contracts.

> [!todo]
> After the API facade is thin enough, run a fresh CLI-API-Frontend contract sweep to confirm no endpoint shape drift remains.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
