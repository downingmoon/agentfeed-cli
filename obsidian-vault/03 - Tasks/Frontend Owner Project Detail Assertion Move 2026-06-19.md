---
title: Frontend Owner Project Detail Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 owner project detail assertion move
---

# Frontend Owner Project Detail Assertion Move 2026-06-19

> [!success]
> `owner-project-detail-contracts.contract.test.ts`의 surface/response contract orchestration을 새 `owner-project-detail-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/owner-project-detail-contracts.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/owner-project-detail-assertions.ts`
- 기존 fixture 유지: `agentfeed-frontend/src/lib/owner-project-detail-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: assertion move 완료 후 사용자 요청에 따른 현재 서버 1회 예외 배포는 별도 배포 노트에 기록
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `owner-project-detail-contracts.contract.test.ts`는 `assertOwnerProjectDetailContracts()` runner만 호출하도록 축소했다.
- Owner-aware project detail surface and response contract orchestration은 `owner-project-detail-assertions.ts`가 소유한다.
- Owner project detail fixtures and fetch/normalization assertions는 기존 `owner-project-detail-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `owner-project-detail-contracts.contract.test.ts`: 5 pure LOC, 6 total LOC
  - `owner-project-detail-assertions.ts`: 5 pure LOC, 6 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `8f9a06b` — `Move owner project detail assertions`

## Follow-up

> [!todo]
> Candidate `collection-evidence-malformed.contract.test.ts` handled in [[Frontend Collection Evidence Malformed Assertion Move 2026-06-20]]. Current next re-scan candidate: `api-json-boundary.contract.test.ts` at 8 pure LOC.

> [!todo]
> Keep owner-aware project detail assertion orchestration in `owner-project-detail-assertions.ts`; keep owner project detail fixtures and API response checks in `owner-project-detail-fixtures.ts`; keep the focused runner at `owner-project-detail-contracts.contract.test.ts` slim.
