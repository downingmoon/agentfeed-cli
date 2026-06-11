---
title: Frontend API Worklog Detail Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Worklog Card Split 2026-06-11]]"
  - "[[Frontend API Privacy Scan Split 2026-06-11]]"
  - "[[Worklog Detail Response Guard 2026-06-08]]"
---

# Frontend API Worklog Detail Split 2026-06-11

## Summary

Frontend worklog detail outcome, timeline, full-detail shape, and strict detail response parsing were extracted from `src/lib/api.ts` into `src/lib/api-worklog-detail.ts` while preserving the public `@/lib/api` facade.

## Why

The detail parser is the boundary that prevents malformed outcome, timeline, privacy scan, social, viewer-state, and collection evidence from reaching the worklog detail UI. Moving it out of the large API facade makes this fail-closed contract easier to audit and keeps the remaining review parser extraction smaller.

## Changed

- Added `src/lib/api-worklog-detail.ts`.
- Moved these focused contracts/parsers:
  - `ApiOutcomeItem`
  - `ApiTimelineItem`
  - `ApiWorklog`
  - `normalizeOutcomeItemsForContract`
  - `normalizeTimelineItemsForContract`
  - `normalizeWorklogDetailResponse`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract checks for detail author parsing and outcome/timeline fail-closed behavior to the new detail module.

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
- New module size: `src/lib/api-worklog-detail.ts` is 108 lines.
- LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc --noEmit` from `npm run lint` was used as the TypeScript gate.

## Commit

- Frontend: `d5b78c3 Isolate frontend worklog detail contracts`

## Remaining follow-up

> [!todo]
> Extract worklog review response parsing next. It still owns review preview parsing and should use `api-privacy-scan`, `api-worklog-card`, and shared metrics/source contracts.

> [!todo]
> Continue reducing `src/lib/api.ts`; it is still oversized but now no longer owns project summary, card, privacy scan, or detail parsers.

> [!warning]
> Server deployment remains intentionally skipped for this goal until local/code quality is complete.
