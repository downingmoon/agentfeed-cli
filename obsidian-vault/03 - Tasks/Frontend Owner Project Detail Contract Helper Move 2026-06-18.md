---
title: Frontend Owner Project Detail Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Owner Project Detail Contract Helper Move 2026-06-18

## Context

The post-worklog-card-malformed-adapter contract size re-scan showed `agentfeed-frontend/src/lib/owner-project-detail-contracts.contract.test.ts` as the largest frontend contract file at 73 pure LOC. It already used `owner-project-detail-fixtures.ts`, but the owner-aware detail surface check, request capture, JSON response helper, and stats normalization assertions were still inline.

## Changed

- Moved owner-aware project detail surface/request/normalization contract helpers into existing `src/lib/owner-project-detail-fixtures.ts`.
- Kept `src/lib/owner-project-detail-contracts.contract.test.ts` focused on invoking the exported surface and response contract helpers.
- Preserved existing owner-aware project detail endpoint/path and public metric null-normalization behavior without runtime app changes.
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
  - `src/lib/owner-project-detail-contracts.contract.test.ts`: 11 lines / 9 pure LOC
  - `src/lib/owner-project-detail-fixtures.ts`: 143 lines / 132 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `eed91cc` — `Move owner project detail contract helpers`

## Follow-up

- Keep owner-aware project detail contract helpers in `owner-project-detail-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `owner-project-detail-fixtures.ts`, now 132 pure LOC.
- Next re-scan candidate: `notification-url-contracts.contract.test.ts` at 72 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
