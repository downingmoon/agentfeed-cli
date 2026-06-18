---
title: Frontend Project Schema Variant Strict Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - strict-fields
  - enterprise-readiness
status: done
---

# Frontend Project Schema Variant Strict Assertion Move 2026-06-18

## Context

The post-worklog-metric-evidence fixture split re-scan showed `agentfeed-frontend/src/lib/project-schema-variants-strict-fields.contract.test.ts` as the largest remaining contract test at 45 pure LOC. It still owned API/list response helpers, fetch override/restore handling, and valid schema variant preservation assertions directly in the runner.

`src/lib/project-schema-variant-fixtures.ts` was already 172 pure LOC, so this pass intentionally avoided growing that near-warning shared fixture file.

## Changed

- Added `src/lib/project-schema-variant-strict-field-assertions.ts` for API/list response helpers, fetch restore handling, and valid variant preservation assertions.
- Reduced `src/lib/project-schema-variants-strict-fields.contract.test.ts` to invoking `assertProjectSchemaVariantStrictFieldContracts()` with the existing async failure handler.
- Kept `src/lib/project-schema-variant-fixtures.ts` unchanged at 172 pure LOC.
- Preserved existing valid schema variant coverage for `users.projects`, `worklogs.get`, and `projects.list` without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported assertion/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/project-schema-variants-strict-fields.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/project-schema-variant-strict-field-assertions.ts`: 56 lines / 50 pure LOC
  - `src/lib/project-schema-variant-fixtures.ts`: unchanged 183 lines / 172 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d55259d` — `Move project schema strict field assertions`

## Follow-up

- Keep valid schema variant preservation assertion flow in `project-schema-variant-strict-field-assertions.ts`.
- Keep shared valid/malformed project schema payloads in `project-schema-variant-fixtures.ts`; re-check size before adding cases because it is 172 pure LOC.
- [x] Tied next re-scan candidate `auth-next-contracts.contract.test.ts` handled in [[Frontend Auth Next Assertion Move 2026-06-18]]. Subsequent candidate `worklog-review-strict-fields.contract.test.ts` handled in [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]]. Current next re-scan candidate: `project-malformed-response-contracts.contract.test.ts` at 44 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
