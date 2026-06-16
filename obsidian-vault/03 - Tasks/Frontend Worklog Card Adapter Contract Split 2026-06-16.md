---
title: Frontend Worklog Card Adapter Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - worklog-card
  - adapter
  - enterprise-readiness
status: done
---

# Frontend Worklog Card Adapter Contract Split 2026-06-16

## Context

After the worklog card response guard split, the next contract size re-scan showed `agentfeed-frontend/src/lib/worklog-card-adapter.contract.test.ts` at 181 pure LOC. It mixed valid adapter preservation/social normalization checks with malformed source, metrics, and viewer-state fail-closed cases.

## Changed

- Added `src/lib/worklog-card-malformed-adapter.contract.test.ts` for malformed worklog card adapter source, metrics, and viewer-state cases.
- Kept `src/lib/worklog-card-adapter.contract.test.ts` focused on valid source preservation, multi-agent metrics preservation, nullable metric handling, viewer-state/social hydration, raw agent key normalization, and nullable array normalization.
- Registered the malformed adapter contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - collection window/source evidence survives the adapter.
  - multi-agent models, metrics, modes, and collection sources are preserved.
  - nullable hidden/unknown metrics remain nullable rather than rendering as zero.
  - viewer-state hydration and optimistic social overrides keep counts consistent.
  - malformed source, metrics, and viewer-state payloads fail closed with the frontend adapter diagnostic.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/worklog-card-adapter.contract.test.ts`: 140 lines / 116 pure LOC
  - `src/lib/worklog-card-malformed-adapter.contract.test.ts`: 86 lines / 74 pure LOC
  - `scripts/run-contract-tests.mjs`: 170 lines / 161 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `639a246` — `Split worklog card adapter contracts`

## Follow-up

- Keep valid worklog card adapter normalization checks separate from malformed source/metrics/viewer-state fail-closed cases.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
