---
title: Frontend API Facade Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - refactor
  - enterprise-quality
status: done
related:
  - "[[Frontend API Worklog Mutation Split 2026-06-11]]"
  - "[[Frontend API Project Split 2026-06-11]]"
---

# Frontend API Facade Split 2026-06-11

## Summary

`src/lib/api.ts` was reduced from an oversized implementation module into a thin public facade. Endpoint clients and shared action response contracts now live in focused modules, while existing `@/lib/api` imports remain stable through re-exports.

## Why

The frontend API boundary is the main contract surface between Backend, Frontend, and CLI-driven publishing flows. Keeping endpoint implementations inside a 400+ pure LOC facade made ownership unclear and allowed reverse dependencies such as `api-worklog-actions.ts` importing types from the public facade.

## Changed

- Rewrote `src/lib/api.ts` as a 47 pure LOC facade/barrel.
- Added focused endpoint/client modules:
  - `src/lib/api-system-auth-client.ts`
  - `src/lib/api-feed-client.ts`
  - `src/lib/api-worklogs-client.ts`
  - `src/lib/api-social-client.ts`
  - `src/lib/api-users-client.ts`
  - `src/lib/api-projects-client.ts`
  - `src/lib/api-discovery-client.ts`
  - `src/lib/api-moderation-client.ts`
  - `src/lib/api-me-client.ts`
- Added `src/lib/api-action-response.ts` for shared `{ ok: true }` response parsing and empty-ok fallback envelopes.
- Moved notification read response parsing into `src/lib/api-notifications.ts`.
- Moved worklog action response types into `src/lib/api-worklog-actions.ts` so the action contract module no longer imports from `@/lib/api`.
- Retargeted source contract guards to the new owning modules.

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
- Pure LOC after split:
  - `src/lib/api.ts`: 47
  - `src/lib/api-me-client.ts`: 73
  - `src/lib/api-notifications.ts`: 82
  - All newly added endpoint modules are below the 250 LOC ceiling.
- Forbidden-pattern scan found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catches, or `from './api'` reverse imports in the changed API modules.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `1871f67 Shrink frontend API facade to endpoint clients`

## Remaining follow-up

> [!todo]
> Run a fresh CLI-API-Frontend contract sweep now that the frontend API boundary is split by endpoint surface.

> [!todo]
> Continue checking Backend and CLI boundary modules for oversized files or facade reverse dependencies.

> [!warning]
> Server, infra, and CI/CD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
