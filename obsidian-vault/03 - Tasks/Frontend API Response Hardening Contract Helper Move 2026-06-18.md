---
title: Frontend API Response Hardening Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api
  - enterprise-readiness
status: done
---

# Frontend API Response Hardening Contract Helper Move 2026-06-18

## Context

The post-API-response-body-hardening contract size re-scan showed `agentfeed-frontend/src/lib/api-response-hardening.contract.test.ts` as the largest frontend contract file at 68 pure LOC. It already used `api-response-hardening-fixtures.ts`, but unexpected auth user field checks, malformed auth error envelope suppression, and auth-error event scenario assertions were still inline.

## Changed

- Moved API response hardening assertion helpers into existing `src/lib/api-response-hardening-fixtures.ts`.
- Kept `src/lib/api-response-hardening.contract.test.ts` focused on invoking the exported API response hardening contract helper.
- Preserved existing auth response strict-field rejection, malformed 401 error envelope suppression, and global auth-error event behavior without runtime app changes.
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
  - `src/lib/api-response-hardening.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/api-response-hardening-fixtures.ts`: 166 lines / 154 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d98cb98` — `Move API response hardening contract helpers`

## Follow-up

- Keep API response hardening contract helpers in `api-response-hardening-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `api-response-hardening-fixtures.ts`, now 154 pure LOC.
- [x] `url-navigation-contracts.contract.test.ts` handled in [[Frontend URL Navigation Contract Fixture Split 2026-06-18]].
- [x] `project-mutation-detail-adapters.contract.test.ts` handled in [[Frontend Project Mutation Detail Adapter Fixture Split 2026-06-18]].
- [x] `identity-profile-contracts.contract.test.ts` handled in [[Frontend Identity Profile Contract Helper Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
