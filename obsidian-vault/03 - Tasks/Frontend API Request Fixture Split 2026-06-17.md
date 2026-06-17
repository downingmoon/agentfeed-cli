---
title: Frontend API Request Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-client
  - enterprise-readiness
status: done
---

# Frontend API Request Fixture Split 2026-06-17

## Context

After the worklog action response guard split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-request-contracts.contract.test.ts` as the largest frontend contract file at 132 pure LOC. It mixed response stubs/project fixture construction with endpoint invocation and URL/method assertions.

## Changed

- Added `src/lib/api-request-contract-fixtures.ts` for the API request contract response stubs and project response fixture.
- Kept `src/lib/api-request-contracts.contract.test.ts` focused on endpoint invocation and URL/method/query assertions.
- Preserved existing API request contract behavior without runtime app changes.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-request-contracts.contract.test.ts`: 103 lines / 86 pure LOC
  - `src/lib/api-request-contract-fixtures.ts`: 49 lines / 47 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `a8a2a16` — `Split API request contract fixtures`

## Follow-up

- Keep API request response stubs separate from endpoint URL/method assertions when adding future request contract coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
