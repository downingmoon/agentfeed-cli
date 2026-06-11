---
title: Frontend API CLI Auth Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Settings Split 2026-06-11]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
---

# Frontend API CLI Auth Split 2026-06-11

## Summary

Frontend CLI authorization session and approval response parsing was extracted from `src/lib/api.ts` into `src/lib/api-cli-auth.ts` while preserving the public `@/lib/api` `cliAuth.session` and `cliAuth.approve` facades.

## Why

CLI auth is a one-time browser-to-terminal authorization boundary. It must fail closed on malformed session status, polling interval, timestamps, device label, and approval response state before the CLI authorization UI renders retry, login, approved, or terminal states.

## Changed

- Added `src/lib/api-cli-auth.ts`.
- Moved these focused contracts/parsers:
  - `CliAuthSessionStatus`
  - `CliAuthSessionMetadata`
  - `CliAuthApproveResult`
  - `normalizeCliAuthSession`
  - `normalizeCliAuthApproveResult`
- Kept existing imports from `@/lib/api` working through type re-exports.
- Retargeted CLI auth enum assertion guards to the new focused module.

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
- New module size: `src/lib/api-cli-auth.ts` is 67 pure LOC.
- `src/lib/api.ts` shrank from 644 to 588 pure LOC in this slice, but remains oversized as an inherited facade.
- Server deployment was intentionally skipped.

## Commit

- Frontend: `42db11f Isolate frontend CLI auth contracts`

## Remaining follow-up

> [!todo]
> Extract `auth.me` account identity parsing separately; it is a different authenticated user boundary from one-time CLI authorization.

> [!todo]
> Continue shrinking `src/lib/api.ts`, then run a fresh CLI-API-Frontend contract sweep once the facade is thin enough.

> [!warning]
> Server/infra/CICD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
