---
title: Frontend Collection Evidence Malformed Assertion Move 2026-06-20
date: 2026-06-20
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-20 collection evidence malformed assertion move
---

# Frontend Collection Evidence Malformed Assertion Move 2026-06-20

> [!success]
> `collection-evidence-malformed.contract.test.ts`의 malformed collection evidence fail-closed assertion loop를 `collection-evidence-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/collection-evidence-malformed.contract.test.ts`
- 확장 helper: `agentfeed-frontend/src/lib/collection-evidence-assertions.ts`
- 기존 fixture 유지: `agentfeed-frontend/src/lib/collection-evidence-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `collection-evidence-malformed.contract.test.ts`는 `assertCollectionEvidenceMalformedContracts()` runner만 호출하도록 축소했다.
- Malformed models, agent metrics, collection sources, quality, and window reason fail-closed assertion loop는 `collection-evidence-assertions.ts`가 소유한다.
- Malformed review case fixtures는 기존 `collection-evidence-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일이 아니라 기존 imported assertion/helper module 확장이다.
- Catch branch는 `failedClosed` positive predicate로 정리해 non-null assertion audit 오탐을 피했다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse audit ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `collection-evidence-malformed.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `collection-evidence-assertions.ts`: 33 pure LOC, 40 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `c4a9320` — `Move collection evidence malformed assertions`

## Follow-up

> [!todo]
> Current next re-scan candidate: `api-json-boundary.contract.test.ts` at 8 pure LOC.

> [!todo]
> Keep collection evidence valid and malformed assertion orchestration in `collection-evidence-assertions.ts`; keep malformed review cases in `collection-evidence-fixtures.ts`; keep the focused runners slim.
