---
title: Frontend API Search Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Worklog Review Split 2026-06-11]]"
  - "[[Frontend API Worklog Detail Split 2026-06-11]]"
---

# Frontend API Search Split 2026-06-11

## Summary

Frontend search result, search suggestion, and tag discovery response parsing were extracted from `src/lib/api.ts` into `src/lib/api-search.ts` while keeping the public `@/lib/api` facade stable.

## Why

Search is a user-facing aggregation boundary. It combines worklogs, users, projects, prompt previews, pagination, suggestions, and tags. Malformed rows must fail closed at the API boundary instead of being hidden by page-level fallbacks or unsafe merge behavior.

## Changed

- Added `src/lib/api-search.ts`.
- Moved these focused contracts/parsers:
  - `SearchQueryType`
  - `ApiSearchResults`
  - `ApiSearchResponse`
  - `ApiSearchSuggestion`
  - `ApiTagItem`
  - `normalizeSearchResponse`
  - `normalizeSearchSuggestions`
  - `normalizeTagItems`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract guards for prompt authors, result users, project owners, and search query filter values to the new module.

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
- New module size: `src/lib/api-search.ts` is 117 pure LOC.
- `src/lib/api.ts` remains oversized as an inherited facade, but this slice removed search and tag discovery parsing from it.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `704e184 Isolate frontend search contracts`

## Remaining follow-up

> [!todo]
> Extract explore landing/discovery response parsing from `src/lib/api.ts` into a focused contract module next.

> [!todo]
> Continue shrinking `src/lib/api.ts` one response contract surface at a time until it becomes a thin transport facade.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
