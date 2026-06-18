---
title: Frontend User Activity Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - user
  - enterprise-readiness
status: done
---

# Frontend User Activity Contract Fixture Split 2026-06-18

## Context

The post-worklog-card-share contract size re-scan showed `agentfeed-frontend/src/lib/user-activity-contracts.contract.test.ts` tied as the largest frontend contract file at 68 pure LOC. It still owned the user activity surface check, request recorder, response fixture, encoded username/path/query assertions, and fetch restore runner inline.

## Changed

- Split user activity fixtures and contract runner into `src/lib/user-activity-contract-fixtures.ts`.
- Kept `src/lib/user-activity-contracts.contract.test.ts` focused on invoking the exported user activity contract helper.
- Preserved existing `/users/{username}/activity` surface, encoded username path, from/to query parameters, and hidden token null behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/user-activity-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/user-activity-contract-fixtures.ts`: 72 lines / 64 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `034d2cd` — `Split user activity contract fixtures`

## Follow-up

- Keep user activity fixtures and contract runner in `user-activity-contract-fixtures.ts`.
- Next re-scan candidates: `api-error-diagnostics.contract.test.ts`, `api-response-body-hardening.contract.test.ts`, and `api-response-hardening.contract.test.ts` tied at 68 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
