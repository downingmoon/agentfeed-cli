---
title: Frontend API Worklog Card Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Project Summary Split 2026-06-11]]"
  - "[[Worklog Card List Response Guard 2026-06-08]]"
---

# Frontend API Worklog Card Split 2026-06-11

## Summary

Frontend worklog card status, card shape, single-card parsing, and strict list parsing were extracted from `src/lib/api.ts` into `src/lib/api-worklog-card.ts` while preserving the public `@/lib/api` facade.

## Why

Worklog cards are reused by feed, following feed, search, explore, user profile worklogs, project worklogs, owner worklogs, and bookmarks. Keeping that parser inside the large API facade made contract drift harder to audit across all those surfaces.

## Changed

- Added `src/lib/api-worklog-card.ts`.
- Moved these focused contracts/parsers:
  - `ApiWorklogStatus`
  - `WORKLOG_STATUSES`
  - `ApiWorklogCard`
  - `normalizeWorklogCardForContract`
  - `normalizeWorklogCardListResponse`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract checks to the new card module.

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

- `npm run lint` passed.
- `npm test` passed via `scripts/run-contract-tests.mjs`.
- Next.js production build passed with local DNS-less API override.
- New module size: `src/lib/api-worklog-card.ts` is 86 lines.
- LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc --noEmit` from `npm run lint` was used as the TypeScript gate.

## Commit

- Frontend: `b3d2f69 Isolate frontend worklog card contracts`

## Remaining follow-up

> [!todo]
> Split worklog detail and worklog review response parsers separately. They still combine outcome, timeline, privacy scan, preview, metrics, and source parsing in `src/lib/api.ts`.

> [!warning]
> Server deployment remains intentionally skipped for this goal until local/code quality is complete.
