---
title: Frontend API Project Summary Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Worklog Card List Response Guard 2026-06-08]]"
  - "[[User Project Strict Response Boundary 2026-06-09]]"
---

# Frontend API Project Summary Split 2026-06-11

## Summary

Frontend project summary, visibility, list response, and project stats parsing were extracted from `src/lib/api.ts` into `src/lib/api-project-summary.ts` while preserving the public `@/lib/api` type surface.

## Why

`src/lib/api.ts` still carries multiple API domains. Project summary parsing is shared by project pages, user project lists, worklog cards, and worklog details, so it needed a focused contract module before the larger worklog card parser can be split safely.

## Changed

- Added `src/lib/api-project-summary.ts`.
- Moved these focused contracts/parsers:
  - `ProjectVisibility`
  - `ApiProjectSummary`
  - `ApiProjectStats`
  - `PROJECT_VISIBILITIES`
  - `normalizeProjectStats`
  - `optionalProjectSummaryForContractForError`
  - `normalizeProjectSummaryForRead`
  - `normalizeProjectListResponse`
- Kept `@/lib/api` exports for existing consumers.
- Retargeted source contract checks from `src/lib/api.ts` to `src/lib/api-project-summary.ts` where the parser now lives.

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
- New module size: `src/lib/api-project-summary.ts` is 134 lines.
- Inherited oversized files remain: `src/lib/api.ts` and `src/lib/page-source-contract.test.ts`.

## Commit

- Frontend: `c1f2851 Isolate frontend project summary contracts`

## Remaining follow-up

> [!todo]
> Continue the same extraction pattern for `normalizeWorklogCardForContract`, then search/explore project-specific parsers. Do not combine those into this slice because worklog card parsing still mixes author, project, metrics, social, viewer-state, and privacy-adjacent fields.

> [!warning]
> Server deployment was intentionally skipped for this enterprise-quality local/code verification goal.
