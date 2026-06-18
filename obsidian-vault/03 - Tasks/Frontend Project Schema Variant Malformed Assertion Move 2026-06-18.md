---
title: Frontend Project Schema Variant Malformed Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Schema Variant Malformed Assertion Move 2026-06-18

## Context

The post-auth.me fixture split re-scan showed `agentfeed-frontend/src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts` as the largest remaining contract test at 48 pure LOC. `project-schema-variant-fixtures.ts` already owned valid and malformed schema variant payloads and was still below the 200 pure LOC guardrail, so this work moved the remaining malformed assertion harness into that fixture module.

## Changed

- Moved API/list response helpers, project/user/worklog action selection, fail-closed capture, fetch restore handling, and malformed variant assertion runner into `src/lib/project-schema-variant-fixtures.ts`.
- Reduced `src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts` to invoking `assertProjectSchemaVariantMalformedStrictFieldContracts()` with its async failure handler.
- Preserved existing project schema variant malformed strict-field behavior without runtime app changes.
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
  - `src/lib/project-schema-variants-malformed-strict-fields.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/project-schema-variant-fixtures.ts`: 183 lines / 172 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `867dfd9` — `Move project schema variant malformed assertions`

## Follow-up

- Keep project schema variant valid/malformed payloads and malformed assertion flow in `project-schema-variant-fixtures.ts`.
- Re-check `project-schema-variant-fixtures.ts` before adding new cases; current size is 172 pure LOC.
- Remaining next re-scan candidates: `api-surface-contracts.contract.test.ts` and `read-side-strict-fields.contract.test.ts` at 47 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
