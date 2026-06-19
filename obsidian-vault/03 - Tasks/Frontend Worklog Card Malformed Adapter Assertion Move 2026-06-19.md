---
title: Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 worklog card malformed adapter assertion move
---

# Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19

> [!success]
> `worklog-card-malformed-adapter.contract.test.ts`의 malformed worklog card adapter assertion orchestration을 새 `worklog-card-malformed-adapter-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/worklog-card-malformed-adapter.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/worklog-card-malformed-adapter-assertions.ts`
- 기존 fixture 유지: `agentfeed-frontend/src/lib/worklog-card-malformed-adapter-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI adapter contract-test refactor라 생략

## Changes

- `worklog-card-malformed-adapter.contract.test.ts`는 `assertWorklogCardMalformedAdapterContracts()` runner만 호출하도록 축소했다.
- Malformed source, metrics, and viewer_state adapter fail-closed assertion loops는 `worklog-card-malformed-adapter-assertions.ts`가 소유한다.
- Malformed card data fixtures and `assertAdapterContractMismatch()`는 기존 `worklog-card-malformed-adapter-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `worklog-card-malformed-adapter.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `worklog-card-malformed-adapter-assertions.ts`: 12 pure LOC, 15 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `8b4459d` — `Move worklog card malformed adapter assertions`

## Follow-up

> [!todo]
> Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Current next re-scan candidate: `collection-evidence-malformed.contract.test.ts` at 9 pure LOC.

> [!todo]
> Keep malformed worklog card adapter assertion loops in `worklog-card-malformed-adapter-assertions.ts`; keep malformed card cases in `worklog-card-malformed-adapter-fixtures.ts`; keep the focused runner at `worklog-card-malformed-adapter.contract.test.ts` slim.
