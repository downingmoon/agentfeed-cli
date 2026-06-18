---
title: Frontend Notification URL Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - notifications
  - enterprise-readiness
status: done
---

# Frontend Notification URL Contract Helper Move 2026-06-18

## Context

The post-owner-project-detail contract size re-scan showed `agentfeed-frontend/src/lib/notification-url-contracts.contract.test.ts` as the largest frontend contract file at 72 pure LOC. It already used `notification-url-contract-fixtures.ts`, but notification href, path-segment encoding, and external URL sanitizer assertions were still inline.

## Changed

- Moved notification URL/path-segment/external URL sanitizer assertions into existing `src/lib/notification-url-contract-fixtures.ts`.
- Kept `src/lib/notification-url-contracts.contract.test.ts` focused on invoking the exported notification URL contract helper.
- Preserved existing notification profile/worklog/comment route encoding and unsafe external URL rejection behavior without runtime app changes.
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
  - `src/lib/notification-url-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/notification-url-contract-fixtures.ts`: 143 lines / 127 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d80c7aa` — `Move notification URL contract helpers`

## Follow-up

- Keep notification URL/path-segment/external URL sanitizer assertions in `notification-url-contract-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `notification-url-contract-fixtures.ts`, now 127 pure LOC.
- Re-scan found `project-summary-adapters.contract.test.ts` tied as the largest contract file and moved helpers in [[Frontend Project Summary Adapter Contract Helper Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
