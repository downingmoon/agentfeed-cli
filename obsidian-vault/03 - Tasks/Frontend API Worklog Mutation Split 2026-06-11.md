---
title: Frontend API Worklog Mutation Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Project Split 2026-06-11]]"
  - "[[Frontend API Account Split 2026-06-11]]"
---

# Frontend API Worklog Mutation Split 2026-06-11

## Summary

Frontend worklog create/update request types and mutation response parsing were extracted from `src/lib/api.ts` into `src/lib/api-worklog-mutations.ts` while keeping the public `@/lib/api` worklog client facade stable.

## Why

Worklog create/update is the central publishing path between CLI-collected drafts, review screens, and persisted backend worklogs. The frontend must fail closed on malformed mutation responses before UI state changes or review/publish flows continue.

## Changed

- Added `src/lib/api-worklog-mutations.ts`.
- Moved these focused contracts and parsers:
  - `CreateWorklogBody`
  - `UpdateWorklogBody`
  - `ApiCreatedWorklog`
  - `ApiUpdatedWorklog`
  - `normalizeWorklogCreateResponse`
  - `normalizeWorklogUpdateResponse`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Added source contract guards so create/update response parsers stay in the focused mutation module.
- Removed stale worklog mutation parser imports and definitions from `src/lib/api.ts`.

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
- New module size: `src/lib/api-worklog-mutations.ts` is 53 pure LOC.
- `src/lib/api.ts` is now 429 pure LOC after this slice.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `e37d366 Isolate frontend worklog mutation contracts`

## Remaining follow-up

> [!todo]
> Continue shrinking `src/lib/api.ts` by endpoint surface until it is primarily a facade over focused contract modules.

> [!todo]
> Run a fresh CLI-API-Frontend contract sweep after the facade split stabilizes.

> [!warning]
> Server, infra, and CI/CD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
