---
title: Frontend API Settings Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Comments Moderation Split 2026-06-11]]"
  - "[[Settings Username Boundary Validation Guard 2026-06-09]]"
---

# Frontend API Settings Split 2026-06-11

## Summary

Frontend user settings response parsing was extracted from `src/lib/api.ts` into `src/lib/api-settings.ts` while preserving the public `@/lib/api` `me.settings`, `me.updatePrivacySettings`, and `me.updateNotificationSettings` facades.

## Why

Settings is an account preference boundary. It must fail closed on malformed privacy defaults, notification preference fields, visibility enum drift, and unexpected backend keys before the Settings UI renders state or performs partial-save recovery.

## Changed

- Added `src/lib/api-settings.ts`.
- Moved these focused contracts/parsers:
  - `ApiPrivacySettings`
  - `ApiNotificationSettings`
  - `ApiUserSettings`
  - explicit settings field allowlists
  - `normalizeUserSettings`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract guards for settings field allowlists, visibility defaults, and unexpected-key rejection to the new module.

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
- `npm test` passed via `scripts/run-contract-tests.mjs` after retargeting stale source guards from `api.ts` to `api-settings.ts`.
- Next.js production build passed with local DNS-less API override.
- New module size: `src/lib/api-settings.ts` is 89 pure LOC.
- `src/lib/api.ts` shrank from 723 to 644 pure LOC in this slice, but remains oversized as an inherited facade.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `df5a202 Isolate frontend settings contracts`

## Remaining follow-up

> [!todo]
> Extract CLI auth and `auth.me` contracts separately; they are authentication/session boundaries and should remain reviewable.

> [!todo]
> Continue shrinking `src/lib/api.ts` until it is a thin client facade, then run a fresh CLI-API-Frontend contract sweep.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
