---
title: Frontend API Privacy Scan Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Worklog Card Split 2026-06-11]]"
  - "[[Privacy Finding Enum Contract Guard 2026-06-08]]"
---

# Frontend API Privacy Scan Split 2026-06-11

## Summary

Frontend privacy finding/status/resolution unions and privacy scan parsing were extracted from `src/lib/api.ts` into `src/lib/api-privacy-scan.ts` while preserving the public `@/lib/api` facade.

## Why

Worklog detail and review responses both depend on the same privacy scan parser. Pulling this shared parser out first reduces coupling and makes the next detail/review parser splits smaller and safer.

## Changed

- Added `src/lib/api-privacy-scan.ts`.
- Moved these focused contracts/parsers:
  - `ApiPrivacyFindingType`
  - `ApiPrivacySeverity`
  - `ApiPrivacyResolution`
  - `ApiPrivacyStatus`
  - `ApiPrivacyFinding`
  - `ApiPrivacyScan`
  - `PRIVACY_FINDING_RESOLUTIONS`
  - `normalizePrivacyScanForContract`
- Updated worklog action parsing to share `PRIVACY_FINDING_RESOLUTIONS` from the privacy scan module.
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted source contract checks to the new privacy scan module.

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
- New module size: `src/lib/api-privacy-scan.ts` is 64 lines.
- LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc --noEmit` from `npm run lint` was used as the TypeScript gate.

## Commit

- Frontend: `7d0860d Isolate frontend privacy scan contracts`

## Remaining follow-up

> [!todo]
> Extract worklog detail response parsing next, importing `normalizePrivacyScanForContract` from `src/lib/api-privacy-scan.ts` and `WORKLOG_STATUSES` from `src/lib/api-worklog-card.ts`.

> [!todo]
> Extract worklog review response parsing after detail, so preview/privacy review contracts can be audited independently.

> [!warning]
> Server deployment remains intentionally skipped for this goal until local/code quality is complete.
