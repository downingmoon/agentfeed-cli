---
title: Frontend Dashboard Action Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 dashboard action assertion move
---

# Frontend Dashboard Action Assertion Move 2026-06-19

> [!success]
> `dashboard-actions.contract.test.ts`의 dashboard recent worklog action URL dot-segment assertions를 새 `dashboard-action-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/dashboard-actions.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/dashboard-action-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 사용자 이번 턴 한정 요청에 따라 작업 완료 후 별도 1회 실행/검증
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `dashboard-actions.contract.test.ts`는 `assertDashboardActionContracts()` runner만 호출하도록 축소했다.
- Raw dot-segment `/worklogs/../review` and encoded dot-segment `/worklogs/%2e%2e` backend action URL fallback assertions는 `dashboard-action-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `dashboard-actions.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `dashboard-action-assertions.ts`: 25 pure LOC, 29 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `a379a85` — `Move dashboard action assertions`

## Follow-up

> [!todo]
> Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Current next re-scan candidate: `worklog-card-malformed-adapter.contract.test.ts` at 10 pure LOC.

> [!todo]
> Keep dashboard action URL dot-segment fallback assertions in `dashboard-action-assertions.ts`; keep the focused runner at `dashboard-actions.contract.test.ts` slim.
