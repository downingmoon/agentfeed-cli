---
title: Frontend Project Response Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Response Contract Split 2026-06-16

## Context

After the worklog card adapter split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-response-contracts.contract.test.ts` at 179 pure LOC. It mixed project response fixtures, valid project list/detail preservation checks, and malformed project response fail-closed cases in one file.

## Changed

- Added `src/lib/project-response-fixtures.ts` for shared project owner, summary, and detail response fixtures.
- Moved malformed project response fail-closed cases into `src/lib/project-malformed-response-contracts.contract.test.ts`.
- Kept `src/lib/project-response-contracts.contract.test.ts` focused on valid project list, user project list, direct project detail, and owner/slug detail payload preservation.
- Registered the malformed project response contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - project list/detail guards preserve valid pagination, owner metadata, nullable stats, repository URL, and agent stats.
  - missing pagination, unknown visibility, unexpected project/wrapper/stat fields, malformed stats, and malformed agent stats fail closed with the project response diagnostic.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/project-response-contracts.contract.test.ts`: 56 lines / 50 pure LOC
  - `src/lib/project-malformed-response-contracts.contract.test.ts`: 107 lines / 102 pure LOC
  - `src/lib/project-response-fixtures.ts`: 49 lines / 47 pure LOC
  - `scripts/run-contract-tests.mjs`: 171 lines / 162 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `3951645` — `Split project response contracts`

## Follow-up

- Keep valid project response preservation checks, malformed response fail-closed cases, and shared fixtures separated when adding future project response coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
