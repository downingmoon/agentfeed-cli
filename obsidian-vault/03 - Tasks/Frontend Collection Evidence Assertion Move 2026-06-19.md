---
title: Frontend Collection Evidence Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 collection evidence assertion move
---

# Frontend Collection Evidence Assertion Move 2026-06-19

> [!success]
> `collection-evidence.contract.test.ts`의 collection evidence valid display assertion orchestration을 새 `collection-evidence-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/collection-evidence.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/collection-evidence-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `collection-evidence.contract.test.ts`는 `assertCollectionEvidenceContracts()` runner만 호출하도록 축소했다.
- Valid collected models display, per-agent metric breakdown preservation, collection quality display, and collection sources trust review assertions는 `collection-evidence-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `collection-evidence.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `collection-evidence-assertions.ts`: 21 pure LOC, 27 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `ef89991` — `Move collection evidence assertions`

## Follow-up

> [!todo]
> Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Current next re-scan candidate: `worklog-card-malformed-adapter.contract.test.ts` at 10 pure LOC.

> [!todo]
> Keep collection evidence valid display assertions in `collection-evidence-assertions.ts`; keep the focused runner at `collection-evidence.contract.test.ts` slim.
