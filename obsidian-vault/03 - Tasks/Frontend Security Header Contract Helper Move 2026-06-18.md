---
title: Frontend Security Header Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - security
  - enterprise-readiness
status: done
---

# Frontend Security Header Contract Helper Move 2026-06-18

## Context

The post-ingestion-token-mutation contract size re-scan showed `agentfeed-frontend/src/lib/security-headers.contract.test.ts` tied for largest remaining contract test at 60 pure LOC. The existing `security-headers-contract-fixtures.ts` already owned security header contract fixture data and CSP parsing.

## Changed

- Moved static security header checks, IP-only server-test header checks, required CSP directive checks, arbitrary inline CSP rejection checks, and API-origin CSP handling checks into existing `src/lib/security-headers-contract-fixtures.ts`.
- Reduced `src/lib/security-headers.contract.test.ts` to invoking `assertSecurityHeaderContracts()`.
- Preserved existing security header contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because no new standalone contract source was added.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/security-headers.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/security-headers-contract-fixtures.ts`: 120 lines / 107 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `86d5773` — `Move security header contract helpers`

## Follow-up

- Keep security header contract helpers in `security-headers-contract-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `security-headers-contract-fixtures.ts`; current size is 107 pure LOC.
- [x] `explore-response-guards.contract.test.ts` handled in [[Frontend Explore Response Guard Fixture Split 2026-06-18]]. Remaining next re-scan candidate: `remaining-read-response-guards.contract.test.ts` at 60 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
