---
title: Frontend API Comments Moderation Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Leaderboard Split 2026-06-11]]"
  - "[[Worklog Detail Response Guard 2026-06-08]]"
---

# Frontend API Comments Moderation Split 2026-06-11

## Summary

Frontend comment, report, and moderation response parsing was extracted from `src/lib/api.ts` into `src/lib/api-comments-moderation.ts` while preserving the public `@/lib/api` client facades.

## Why

Comments and moderation reports are trust-sensitive user-generated-content surfaces. They must fail closed on malformed authors, report reasons, target types, moderation statuses, timestamps, and list envelopes before worklog detail or moderation admin UI renders them.

## Changed

- Added `src/lib/api-comments-moderation.ts`.
- Moved these focused contracts/parsers:
  - `ApiComment`
  - `ApiReportReason`
  - `ApiReportBody`
  - `ApiModerationReportStatus`
  - `ApiModerationReport`
  - `normalizeCommentResponse`
  - `normalizeCommentListResponse`
  - `normalizeModerationReport`
  - `normalizeModerationReportList`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted the comment author source contract guard to the new focused module.

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
- New module size: `src/lib/api-comments-moderation.ts` is 89 pure LOC.
- `src/lib/api.ts` shrank from 798 to 723 pure LOC in this slice, but remains oversized as an inherited facade.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `5d68e4e Isolate frontend comment moderation contracts`

## Remaining follow-up

> [!todo]
> Continue reducing `src/lib/api.ts`; likely next isolated surfaces are auth/settings and worklog mutation contracts.

> [!todo]
> After the API facade is thin enough, run a fresh CLI-API-Frontend contract sweep to confirm no endpoint shape drift remains.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
