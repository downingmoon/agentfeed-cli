---
title: Frontend Social Report Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - social
  - enterprise-readiness
status: done
---

# Frontend Social Report Contract Fixture Split 2026-06-18

## Context

The post-me-settings-mutation contract size re-scan showed `agentfeed-frontend/src/lib/social-report-contracts.contract.test.ts` as the largest frontend contract file at 69 pure LOC. It still owned the social report request recorder, JSON response helper, worklog/comment report assertions, and fetch restore runner inline.

## Changed

- Split social report request fixtures and contract runner into `src/lib/social-report-contract-fixtures.ts`.
- Kept `src/lib/social-report-contracts.contract.test.ts` focused on invoking the exported social report contract helper.
- Preserved existing `social.reportWorklog` and `social.reportComment` encoded path, POST method, request body, and backend `OkResponse` behavior without runtime app changes.
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
  - `src/lib/social-report-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/social-report-contract-fixtures.ts`: 78 lines / 68 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `c9ebfe0` — `Split social report contract fixtures`

## Follow-up

- Keep social report request fixtures and contract runner in `social-report-contract-fixtures.ts`.
- Re-scan found `worklog-detail-strict-fields.contract.test.ts` tied as the largest contract file and moved helpers in [[Frontend Worklog Detail Strict Field Contract Helper Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
