---
title: Frontend Project Response Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Response Assertion Move 2026-06-18

## Context

The post-worklog-review-action assertion split re-scan showed `agentfeed-frontend/src/lib/project-response-contracts.contract.test.ts` tied as a largest remaining contract test at 50 pure LOC. `project-response-fixtures.ts` already owned project payload fixtures and malformed response cases, so this work moved the remaining valid-response assertion harness into that existing fixture module.

## Changed

- Moved valid project list, user project list, direct project detail, owner/slug detail response dispatcher, fetch restore handling, and preservation assertions into `src/lib/project-response-fixtures.ts`.
- Reduced `src/lib/project-response-contracts.contract.test.ts` to invoking `assertValidProjectResponses()` with its async failure handler.
- Preserved existing project response contract behavior without runtime app changes.
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
  - `src/lib/project-response-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/project-response-fixtures.ts`: 159 lines / 150 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `68bf9eb` — `Move project response assertions`

## Follow-up

- Keep project response fixtures, malformed cases, and valid response assertion harness in `project-response-fixtures.ts`.
- Remaining next re-scan candidates: `metadata-strict-fields.contract.test.ts` and `auth-me-contracts.contract.test.ts` at 50 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
