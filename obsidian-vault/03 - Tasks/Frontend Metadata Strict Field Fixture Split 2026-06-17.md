---
title: Frontend Metadata Strict Field Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - metadata
  - enterprise-readiness
status: done
---

# Frontend Metadata Strict Field Fixture Split 2026-06-17

## Context

After the API response envelope fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/metadata-strict-fields.contract.test.ts` tied as the largest frontend contract file at 109 pure LOC. It mixed compatible metadata payloads, malformed strict-field cases, and JSON response setup with compatibility and client-route assertions.

## Changed

- Added `src/lib/metadata-strict-fields-fixtures.ts` for compatible metadata, malformed metadata cases, and the metadata JSON response helper.
- Kept `src/lib/metadata-strict-fields.contract.test.ts` focused on compatibility rejection/allowance assertions and `system.metadata` route behavior.
- Preserved existing metadata strict-field contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/metadata-strict-fields.contract.test.ts`: 56 lines / 50 pure LOC
  - `src/lib/metadata-strict-fields-fixtures.ts`: 65 lines / 63 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `a921cc0` — `Split metadata strict field fixtures`

## Follow-up

- Keep metadata compatibility fixtures separate from route/compatibility assertion flow when adding future metadata contract coverage.
- [x] Next re-scan found `worklog-review-strict-fields.contract.test.ts` tied as the largest contract file and moved fixtures in [[Frontend Worklog Review Strict Field Fixture Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
