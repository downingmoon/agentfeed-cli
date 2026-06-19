---
title: Frontend Username Check Strict Field Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 username check strict field assertion move
---

# Frontend Username Check Strict Field Assertion Move 2026-06-19

> [!success]
> `username-check-strict-fields.contract.test.ts`의 username check strict-field assertion orchestration을 새 `username-check-strict-field-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/username-check-strict-fields.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/username-check-strict-field-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `username-check-strict-fields.contract.test.ts`는 `assertUsernameCheckStrictFieldContracts()` runner만 호출하도록 축소했다.
- Valid available/unavailable username response reason semantics, extra-field fail-closed assertion, and `ApiError` contract-mismatch capture는 `username-check-strict-field-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `username-check-strict-fields.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `username-check-strict-field-assertions.ts`: 23 pure LOC, 28 total LOC
- LSP diagnostics: TypeScript LSP server is not installed in this environment; `npm run lint` (`tsc --noEmit`) passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `7155d8b` — `Move username check strict field assertions`

## Follow-up

> [!todo]
> Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Current next re-scan candidate: `owner-project-detail-contracts.contract.test.ts` at 9 pure LOC.

> [!todo]
> Keep username check strict-field semantics and fail-closed assertions in `username-check-strict-field-assertions.ts`; keep the focused runner at `username-check-strict-fields.contract.test.ts` slim.
