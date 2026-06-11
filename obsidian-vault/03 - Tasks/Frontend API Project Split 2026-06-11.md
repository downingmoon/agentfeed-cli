---
title: Frontend API Project Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Account Split 2026-06-11]]"
  - "[[Frontend API Settings Split 2026-06-11]]"
---

# Frontend API Project Split 2026-06-11

## Summary

Frontend project mutation, project detail, and project list read response parsing was extracted from `src/lib/api.ts` into `src/lib/api-projects.ts` while preserving the public `@/lib/api` project client facade.

## Why

Project create, update, detail, and list flows are core contract boundaries. They must fail closed on malformed owners, stats, visibility, slug, repository URLs, homepage URLs, and list envelopes before project pages or adapters render project state.

## Changed

- Added `src/lib/api-projects.ts`.
- Moved these focused contracts and parsers:
  - `ApiProjectMutationResponse`
  - `ApiProjectDetail`
  - `normalizeProjectMutationResponse`
  - `normalizeProjectDetail`
  - `normalizeProjectListReadResponse`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract guards for project mutation, detail, and list parser ownership to the new module.
- Removed stale project parser imports from `src/lib/api.ts` after extraction.

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
- New module size: `src/lib/api-projects.ts` is 97 pure LOC.
- `src/lib/api.ts` is now 475 pure LOC in this slice, but remains oversized as an inherited facade.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `1581c7b Isolate frontend project contracts`

## Remaining follow-up

> [!todo]
> Extract worklog mutation contracts separately; they remain inside `src/lib/api.ts`.

> [!todo]
> After the API facade is thin enough, run a fresh CLI-API-Frontend contract sweep to confirm no endpoint shape drift remains.

> [!warning]
> Server, infra, and CI/CD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
