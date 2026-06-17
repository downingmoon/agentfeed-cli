---
title: Frontend API Response Hardening Scenario Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-response
  - enterprise-readiness
status: done
---

# Frontend API Response Hardening Scenario Move 2026-06-17

## Context

After the API fetch request hardening fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-response-hardening.contract.test.ts` as the largest frontend contract file at 93 pure LOC. It already used `api-response-hardening-fixtures.ts`, but still owned repeated auth response and 401 auth-event scenario data in the assertion file.

## Changed

- Moved the unexpected auth user response fixture into `src/lib/api-response-hardening-fixtures.ts`.
- Moved auth-error event scenario bodies and expectations into `src/lib/api-response-hardening-fixtures.ts`.
- Kept `src/lib/api-response-hardening.contract.test.ts` focused on API calls, contract failure assertions, and auth-event dispatch checks.
- Preserved existing API response hardening behavior without runtime app changes.
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
  - `src/lib/api-response-hardening.contract.test.ts`: 85 lines / 80 pure LOC
  - `src/lib/api-response-hardening-fixtures.ts`: 72 lines / 66 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `fd204c3` — `Move API response hardening scenarios`

## Follow-up

- Keep API response hardening response/scenario data in `api-response-hardening-fixtures.ts`.
- [x] Next re-scan found `owner-project-detail-contracts.contract.test.ts` as the largest contract file and moved fixtures in [[Frontend Owner Project Detail Fixture Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
