---
title: Frontend API Fetch Timeout Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - api-client
  - timeout
  - enterprise-readiness
status: done
---

# Frontend API Fetch Timeout Contract Split 2026-06-16

## Context

After the API pagination request split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-fetch-request-hardening.contract.test.ts` at 167 pure LOC. It mixed request header/CSRF hardening with timeout and caller cancellation behavior.

## Changed

- Added `src/lib/api-fetch-timeout-cancellation.contract.test.ts` for API timeout and caller cancellation behavior.
- Kept `src/lib/api-fetch-request-hardening.contract.test.ts` focused on GET/POST/DELETE Content-Type and CSRF intent header behavior.
- Registered the timeout/cancellation contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - safe GET requests avoid unnecessary Content-Type and CSRF intent headers.
  - unsafe POST/DELETE requests send CSRF intent headers and only send JSON Content-Type when a body exists.
  - timed-out API requests fail closed as 504 `ApiError` using the shared timeout constant.
  - caller `AbortSignal` is propagated through feed list/following requests and following feed keeps safe sort/tag/cursor params.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-fetch-request-hardening.contract.test.ts`: 101 lines / 94 pure LOC
  - `src/lib/api-fetch-timeout-cancellation.contract.test.ts`: 89 lines / 85 pure LOC
  - `scripts/run-contract-tests.mjs`: 177 lines / 168 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `2842a3b` — `Split API fetch timeout contracts`

## Follow-up

- Keep header/CSRF request hardening separate from timeout/cancellation behavior when adding future API fetch coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
