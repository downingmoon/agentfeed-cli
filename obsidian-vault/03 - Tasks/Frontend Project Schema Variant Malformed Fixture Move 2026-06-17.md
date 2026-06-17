---
title: Frontend Project Schema Variant Malformed Fixture Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Schema Variant Malformed Fixture Move 2026-06-17

## Context

After the worklog mutation body fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts` as the largest frontend contract file at 96 pure LOC. It owned malformed project schema variant data while `project-schema-variant-fixtures.ts` already owned the valid project, user-project, and nested worklog project fixtures.

## Changed

- Moved malformed project schema variant cases into `src/lib/project-schema-variant-fixtures.ts`.
- Kept project/user/worklog API action selection in `src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts` so fixture ownership stays data-oriented.
- Kept the malformed strict-field contract focused on response wrapping and fail-closed assertion flow.
- Preserved existing project schema variant malformed strict-field contract behavior without runtime app changes.
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
  - `src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts`: 54 lines / 48 pure LOC
  - `src/lib/project-schema-variant-fixtures.ts`: 134 lines / 129 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4e0b317` — `Move project schema variant malformed fixtures`

## Follow-up

- Keep project schema variant valid and malformed data in `project-schema-variant-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
