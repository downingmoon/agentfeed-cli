---
title: Frontend API Account Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API CLI Auth Split 2026-06-11]]"
  - "[[Frontend API Settings Split 2026-06-11]]"
---

# Frontend API Account Split 2026-06-11

## Summary

Frontend authenticated account identity, profile mutation, and username mutation response parsing was extracted from `src/lib/api.ts` into `src/lib/api-account.ts` while preserving the public `@/lib/api` facades.

## Why

Account identity is the boundary that feeds AppContext and Settings profile save flows. It must fail closed on malformed authenticated user payloads, timestamp extras, profile mutation PublicUser responses, and username responses before signed-in state or profile save recovery renders.

## Changed

- Added `src/lib/api-account.ts`.
- Moved these focused contracts/parsers:
  - `ApiAuthMe`
  - `ApiUpdateProfileBody`
  - `ApiSetUsernameResponse`
  - `normalizeAuthMe`
  - `normalizeProfileMutationResponse`
  - `normalizeSetUsernameResponse`
- Kept existing imports from `@/lib/api` working through type/function re-exports.
- Retargeted source contract guards for `auth.me` account timestamp extras and profile mutation PublicUser parsing to the new module.

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
- New module size: `src/lib/api-account.ts` is 47 pure LOC.
- `src/lib/api.ts` shrank from 588 to 552 pure LOC in this slice, but remains oversized as an inherited facade.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `e48f2b6 Isolate frontend account contracts`

## Remaining follow-up

> [!todo]
> Extract worklog mutation and project mutation/read contracts separately; they remain inside `src/lib/api.ts`.

> [!todo]
> After the API facade is thin enough, run a fresh CLI-API-Frontend contract sweep to confirm no endpoint shape drift remains.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
