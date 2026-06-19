---
title: Frontend Worklog Metric Evidence Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - metrics
  - enterprise-readiness
status: done
---

# Frontend Worklog Metric Evidence Fixture Split 2026-06-18

## Context

The post-pagination request fixture split re-scan showed `agentfeed-frontend/src/lib/worklog-metric-evidence.contract.test.ts` tied as the largest remaining contract test at 45 pure LOC. It still owned malformed metric/source fixtures, the contract error factory, malformed metric rejection loop, and malformed source rejection loop directly in the runner.

## Changed

- Added `src/lib/worklog-metric-evidence-fixtures.ts` for malformed metric/source fixtures and rejection assertion flow.
- Reduced `src/lib/worklog-metric-evidence.contract.test.ts` to invoking `assertWorklogMetricEvidenceContracts()`.
- Preserved existing metric evidence fail-closed coverage for blank labels, oversized evidence arrays, raw payload extras, source raw path, and source raw collection-window fields without runtime app changes.
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
  - `src/lib/worklog-metric-evidence.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/worklog-metric-evidence-fixtures.ts`: 60 lines / 53 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `e2d1e84` — `Split worklog metric evidence fixtures`

## Follow-up

- Keep metric/source malformed fixtures and rejection assertion flow in `worklog-metric-evidence-fixtures.ts`.
- [x] Remaining next re-scan candidate `project-schema-variants-strict-fields.contract.test.ts` handled in [[Frontend Project Schema Variant Strict Assertion Move 2026-06-18]]. Tied candidate `auth-next-contracts.contract.test.ts` and subsequent candidates `worklog-review-strict-fields.contract.test.ts`, `project-malformed-response-contracts.contract.test.ts`, `leaderboard-response-contracts.contract.test.ts`, and `worklog-card-response-guards.contract.test.ts` handled in [[Frontend Auth Next Assertion Move 2026-06-18]], [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]], [[Frontend Project Malformed Response Assertion Move 2026-06-18]], [[Frontend Leaderboard Response Assertion Move 2026-06-18]], and [[Frontend Worklog Card Response Assertion Move 2026-06-18]]. Tied candidate `social-action-response-guards.contract.test.ts` handled in [[Frontend Social Action Response Assertion Move 2026-06-18]]. Candidate `api-fetch-request-hardening.contract.test.ts` handled in [[Frontend API Fetch Request Hardening Assertion Move 2026-06-18]]. Candidate `worklog-action-malformed-response-guards.contract.test.ts` handled in [[Frontend Worklog Action Malformed Response Assertion Move 2026-06-18]]. Candidate `account-project-mutation-response-guards.contract.test.ts` handled in [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]. Current next re-scan candidates: `moderation-report-contracts.contract.test.ts` and `leaderboard-user-key.contract.test.ts` at 40 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.
