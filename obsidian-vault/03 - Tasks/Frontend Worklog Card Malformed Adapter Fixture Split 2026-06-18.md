---
title: Frontend Worklog Card Malformed Adapter Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - worklog
  - enterprise-readiness
status: done
---

# Frontend Worklog Card Malformed Adapter Fixture Split 2026-06-18

## Context

The post-public-user strict stats contract size re-scan showed `agentfeed-frontend/src/lib/worklog-card-malformed-adapter.contract.test.ts` as the largest frontend contract file at 74 pure LOC. The existing `worklog-card-contract-fixtures.ts` was already near the 200 pure LOC threshold, so the malformed adapter cases needed a dedicated fixture module instead of growing the shared worklog card fixture file.

## Changed

- Split malformed worklog card source, multi-agent metrics, and viewer-state cases into `src/lib/worklog-card-malformed-adapter-fixtures.ts`.
- Moved the adapter mismatch assertion helper into the same malformed fixture module.
- Kept `src/lib/worklog-card-malformed-adapter.contract.test.ts` focused on iterating source, metrics, and viewer-state malformed cases.
- Preserved existing worklog card adapter fail-closed behavior without runtime app changes.
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
  - `src/lib/worklog-card-malformed-adapter.contract.test.ts`: 13 lines / 10 pure LOC
  - `src/lib/worklog-card-malformed-adapter-fixtures.ts`: 74 lines / 65 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `1c7959b` — `Split worklog card malformed adapter fixtures`

## Follow-up

- Keep malformed worklog card adapter source, metrics, and viewer-state cases in `worklog-card-malformed-adapter-fixtures.ts`.
- Keep `worklog-card-contract-fixtures.ts` protected from additional malformed cases while it remains near 200 pure LOC.
- Re-scan found `owner-project-detail-contracts.contract.test.ts` as the largest contract file and moved helpers in [[Frontend Owner Project Detail Contract Helper Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
