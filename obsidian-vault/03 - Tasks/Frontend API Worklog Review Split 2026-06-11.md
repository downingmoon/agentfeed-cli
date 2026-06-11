---
title: Frontend API Worklog Review Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Worklog Detail Split 2026-06-11]]"
  - "[[Frontend API Privacy Scan Split 2026-06-11]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
---

# Frontend API Worklog Review Split 2026-06-11

## Summary

Frontend worklog review response parsing was extracted from `src/lib/api.ts` into `src/lib/api-worklog-review.ts` while preserving the public `@/lib/api` type and client facade.

## Why

The review endpoint is a publish-safety boundary. It must fail closed on malformed preview safety flags, malformed public/private field lists, privacy scan rows, and multi-agent evidence before publish controls render. Keeping this parser in a focused module makes the CLI-API-Frontend contract easier to audit.

## Changed

- Added `src/lib/api-worklog-review.ts`.
- Moved these focused contracts/parsers:
  - `ApiWorklogReview`
  - `worklogReviewContractError`
  - `normalizeWorklogReviewResponse`
- Kept existing imports from `@/lib/api` working through a type re-export.
- Reused focused modules for review dependencies:
  - `api-privacy-scan`
  - `api-project-summary`
  - `api-worklog-card`
  - `api-worklog-metrics-source`
- Added source contract guards so review preview safety, metrics, and source parsing stay in the focused module.

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
- New module size: `src/lib/api-worklog-review.ts` is 75 pure LOC.
- `src/lib/api.ts` remains oversized as an inherited facade, but this slice removed review parsing from it instead of adding more logic.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `a76a2a1 Isolate frontend worklog review contracts`

## Remaining follow-up

> [!todo]
> Extract search and explore response parsers from `src/lib/api.ts` into focused contract modules next.

> [!todo]
> Continue reducing `src/lib/api.ts`; it is still an oversized facade and should keep shrinking through one contract surface per slice.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
