---
title: Frontend API Response Envelope Case Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-response
  - enterprise-readiness
status: done
---

# Frontend API Response Envelope Case Move 2026-06-17

## Context

After the account/project mutation response fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-response-envelope-hardening.contract.test.ts` as the largest frontend contract file at 88 pure LOC. It already used `api-response-envelope-hardening-fixtures.ts`, but still owned malformed envelope response bodies and assertion cases inline.

## Changed

- Moved malformed response envelope cases into `src/lib/api-response-envelope-hardening-fixtures.ts`.
- Moved the unexpected OkResponse payload fixture into `src/lib/api-response-envelope-hardening-fixtures.ts`.
- Kept `src/lib/api-response-envelope-hardening.contract.test.ts` focused on empty-success allowlist, action dispatch, and fail-closed assertions.
- Preserved existing API response envelope hardening behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because no standalone contract source was added.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-response-envelope-hardening.contract.test.ts`: 69 lines / 62 pure LOC
  - `src/lib/api-response-envelope-hardening-fixtures.ts`: 65 lines / 60 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `c03a8b4` — `Move API response envelope cases`

## Follow-up

- Keep API response envelope malformed cases in `api-response-envelope-hardening-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
