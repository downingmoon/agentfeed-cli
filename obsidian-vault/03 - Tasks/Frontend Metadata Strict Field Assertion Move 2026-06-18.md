---
title: Frontend Metadata Strict Field Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - metadata
  - enterprise-readiness
status: done
---

# Frontend Metadata Strict Field Assertion Move 2026-06-18

## Context

The post-project-response assertion move re-scan showed `agentfeed-frontend/src/lib/metadata-strict-fields.contract.test.ts` tied as the largest remaining contract test at 50 pure LOC. `metadata-strict-fields-fixtures.ts` already owned compatible metadata, malformed metadata cases, and the JSON response helper, so this work moved the remaining compatibility and route assertion flow into that fixture module.

## Changed

- Moved metadata compatibility rejection/allowance assertions, insecure server-test review-origin policy assertions, `system.metadata` route assertions, and fetch restore handling into `src/lib/metadata-strict-fields-fixtures.ts`.
- Reduced `src/lib/metadata-strict-fields.contract.test.ts` to invoking `assertMetadataStrictFieldContracts()` with its async failure handler.
- Preserved existing metadata strict-field contract behavior without runtime app changes.
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
  - `src/lib/metadata-strict-fields.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/metadata-strict-fields-fixtures.ts`: 126 lines / 117 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `5d1beaf` — `Move metadata strict field assertions`

## Follow-up

- Keep metadata compatibility fixtures, cases, and assertion flow in `metadata-strict-fields-fixtures.ts`.
- [x] Remaining next re-scan candidate `auth-me-contracts.contract.test.ts` handled in [[Frontend Auth Me Fixture Split 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
