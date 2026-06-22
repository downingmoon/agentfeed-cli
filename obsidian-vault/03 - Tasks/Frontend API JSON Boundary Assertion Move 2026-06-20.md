---
title: Frontend API JSON Boundary Assertion Move 2026-06-20
date: 2026-06-20
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-20 API JSON boundary assertion move
---

# Frontend API JSON Boundary Assertion Move 2026-06-20

> [!success]
> `api-json-boundary.contract.test.ts`의 API response JSON parsing boundary source assertions를 새 `api-json-boundary-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/api-json-boundary.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/api-json-boundary-assertions.ts`
- 검사 대상 유지: `agentfeed-frontend/src/lib/api-transport.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI source-level contract-test refactor라 생략

## Changes

- `api-json-boundary.contract.test.ts`는 `assertApiJsonBoundaryContracts()` runner만 호출하도록 축소했다.
- JSON parse boundary source checks는 `api-json-boundary-assertions.ts`가 소유한다.
- 검사 문자열 자체가 `as unknown` no-excuse audit에 걸리지 않도록 forbidden source pattern을 template literal 조합으로 보관했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse audit ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `api-json-boundary.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `api-json-boundary-assertions.ts`: 11 pure LOC, 15 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `bb8abb1` — `Move API JSON boundary assertions`

## Follow-up

> [!todo]
> `worklog-review-strict-fields.contract.test.ts` was already a 5 pure LOC runner; stale candidate reconciled in [[Frontend Stale Contract TODO Reconciliation 2026-06-22]].

> [!todo]
> Keep API JSON source-boundary assertions in `api-json-boundary-assertions.ts`; keep the focused runner at `api-json-boundary.contract.test.ts` slim.
