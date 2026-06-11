---
title: Frontend API Explore Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Search Split 2026-06-11]]"
  - "[[Frontend API Worklog Review Split 2026-06-11]]"
---

# Frontend API Explore Split 2026-06-11

## Summary

Frontend explore landing response parsing was extracted from `src/lib/api.ts` into `src/lib/api-explore.ts` while preserving the public `@/lib/api` facade.

## Why

Explore is the discovery landing boundary. It mixes trending worklogs, project owners, popular prompts, rising builders, and featured categories. These rows must fail closed at the API boundary so the UI does not hide malformed discovery payloads or render wrong profile/project identities.

## Changed

- Added `src/lib/api-explore.ts`.
- Moved these focused contracts/parsers:
  - `ApiExploreSection`
  - `normalizeExploreSection`
  - explore project parsing
  - popular prompt parsing
  - rising builder parsing
  - featured category parsing
- Kept existing imports from `@/lib/api` working through a type re-export.
- Retargeted source contract guards for rising builders, popular prompt authors, and trending project owners to the new module.

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
- `npm test` passed via `scripts/run-contract-tests.mjs` after updating stale source guards from `api.ts` to `api-explore.ts`.
- Next.js production build passed with local DNS-less API override.
- New module size: `src/lib/api-explore.ts` is 99 pure LOC.
- `src/lib/api.ts` remains oversized as an inherited facade, but this slice removed explore landing parsing from it.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `8d5f2fa Isolate frontend explore contracts`

## Remaining follow-up

> [!todo]
> Continue reducing `src/lib/api.ts`; likely next isolated surfaces are leaderboard, moderation/comment, and auth/settings contracts.

> [!todo]
> After the facade is sufficiently thin, run a fresh CLI-API-Frontend contract sweep to confirm no endpoint shape drift remains.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
