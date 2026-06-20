---
title: Frontend Account Strict Field Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 account strict field assertion move
---

# Frontend Account Strict Field Assertion Move 2026-06-19

> [!success]
> `account-strict-fields.contract.test.ts`의 set-username strict-field assertion orchestration을 새 `account-strict-field-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/account-strict-fields.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/account-strict-field-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 사용자 요청에 따라 작업 문서화 후 별도 1회 실행/검증
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `account-strict-fields.contract.test.ts`는 `assertAccountStrictFieldContracts()` runner만 호출하도록 축소했다.
- Valid backend username response preservation and extra-field fail-closed assertions는 `account-strict-field-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `account-strict-fields.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `account-strict-field-assertions.ts`: 21 pure LOC, 25 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `8639030` — `Move account strict field assertions`

## Follow-up

> [!todo]
> Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Candidate `collection-evidence-malformed.contract.test.ts` handled in [[Frontend Collection Evidence Malformed Assertion Move 2026-06-20]]. Candidate `api-json-boundary.contract.test.ts` handled in [[Frontend API JSON Boundary Assertion Move 2026-06-20]]. Current next re-scan candidate: `worklog-review-strict-fields.contract.test.ts` at 5 pure LOC.

> [!todo]
> Keep set-username strict-field assertions in `account-strict-field-assertions.ts`; keep the focused runner at `account-strict-fields.contract.test.ts` slim.
