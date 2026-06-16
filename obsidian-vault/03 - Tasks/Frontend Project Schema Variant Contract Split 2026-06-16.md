---
title: Frontend Project Schema Variant Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - strict-fields
  - enterprise-readiness
status: done
---

# Frontend Project Schema Variant Contract Split 2026-06-16

## Context

After the project mutation response split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-schema-variants-strict-fields.contract.test.ts` at 175 pure LOC. It mixed schema variant fixtures, valid variant preservation checks, and malformed strict-field fail-closed cases in one file.

## Changed

- Added `src/lib/project-schema-variant-fixtures.ts` for public owner, user project summary, nested project summary, project response, and worklog detail fixtures.
- Moved malformed strict-field cases into `src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts`.
- Kept `src/lib/project-schema-variants-strict-fields.contract.test.ts` focused on valid variant preservation for `users.projects`, `worklogs.get`, and `projects.list`.
- Registered the malformed schema variant contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - user project summaries preserve exact backend owner fields while synthesizing only frontend empty stats.
  - nested worklog project summaries preserve ProjectSummary-only fields.
  - project responses preserve required identity fields.
  - missing ProjectResponse fields, accidental ProjectResponse fields in UserProjectSummary, and owner/stats leaks in nested worklog project summaries fail closed.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/project-schema-variants-strict-fields.contract.test.ts`: 51 lines / 45 pure LOC
  - `src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts`: 102 lines / 96 pure LOC
  - `src/lib/project-schema-variant-fixtures.ts`: 75 lines / 71 pure LOC
  - `scripts/run-contract-tests.mjs`: 173 lines / 164 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `94d0bfa` — `Split project schema variant contracts`

## Follow-up

- Keep valid schema variant preservation checks, malformed strict-field cases, and shared fixtures separated when adding future project schema coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.
