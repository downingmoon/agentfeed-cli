---
title: Frontend Public User Strict Stats Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 public user strict stats assertion move
---

# Frontend Public User Strict Stats Assertion Move 2026-06-19

> [!success]
> `public-user-strict-stats.contract.test.ts`의 public user strict stats assertion orchestration을 새 `public-user-strict-stats-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/public-user-strict-stats.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/public-user-strict-stats-assertions.ts`
- 기존 fixtures: `agentfeed-frontend/src/lib/public-user-strict-stats-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `public-user-strict-stats.contract.test.ts`는 `assertPublicUserStrictStatsContracts()` async runner만 호출하도록 축소했다.
- `users.get()` invocation, `current_streak_days` preservation check, malformed strict public-user case iteration, fetch override/restore flow는 `public-user-strict-stats-assertions.ts`가 소유한다.
- Strict public-user payload/cases and capture helper는 기존 `public-user-strict-stats-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `public-user-strict-stats.contract.test.ts`: 5 pure LOC, 6 total LOC
  - `public-user-strict-stats-assertions.ts`: 18 pure LOC, 20 total LOC
  - `public-user-strict-stats-fixtures.ts`: 55 pure LOC, 59 total LOC
- LSP diagnostics: TypeScript LSP server is not installed in this environment; `npm run lint` (`tsc --noEmit`) passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `5c9836d` — `Move public user strict stats assertions`

## Follow-up

> [!todo]
> Candidate `username-check-strict-fields.contract.test.ts` handled in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]. Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Candidate `collection-evidence-malformed.contract.test.ts` handled in [[Frontend Collection Evidence Malformed Assertion Move 2026-06-20]]. Candidate `api-json-boundary.contract.test.ts` handled in [[Frontend API JSON Boundary Assertion Move 2026-06-20]]. Current next re-scan candidate: `worklog-review-strict-fields.contract.test.ts` at 5 pure LOC.

> [!todo]
> Keep public user strict stats assertions in `public-user-strict-stats-assertions.ts`; keep fixtures and capture helper in `public-user-strict-stats-fixtures.ts`.
