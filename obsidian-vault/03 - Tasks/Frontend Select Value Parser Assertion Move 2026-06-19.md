---
title: Frontend Select Value Parser Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 select value parser assertion move
---

# Frontend Select Value Parser Assertion Move 2026-06-19

> [!success]
> `select-value-parsers.contract.test.ts`의 project sort, moderation report status, and report reason select parser assertions를 새 `select-value-parser-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/select-value-parsers.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/select-value-parser-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `select-value-parsers.contract.test.ts`는 `assertSelectValueParserContracts()` runner만 호출하도록 축소했다.
- Project sort select parser, moderation report status parser, worklog report reason parser allowed-value assertions and unsupported-value throw assertions는 `select-value-parser-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `select-value-parsers.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `select-value-parser-assertions.ts`: 25 pure LOC, 30 total LOC
- LSP diagnostics: TypeScript LSP diagnostics transport failed in this environment; `npm run lint` (`tsc --noEmit`) passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `8a553bf` — `Move select value parser assertions`

## Follow-up

> [!todo]
> Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Candidate `public-user-strict-stats.contract.test.ts` handled in [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]. Candidate `username-check-strict-fields.contract.test.ts` handled in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]. Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Candidate `collection-evidence-malformed.contract.test.ts` handled in [[Frontend Collection Evidence Malformed Assertion Move 2026-06-20]]. Candidate `api-json-boundary.contract.test.ts` handled in [[Frontend API JSON Boundary Assertion Move 2026-06-20]]. Current next re-scan candidate: `worklog-review-strict-fields.contract.test.ts` at 5 pure LOC.

> [!todo]
> Keep select parser option/value coverage in `select-value-parser-assertions.ts`; keep source-level anti-cast checks in `select-value-source-contract.test.ts` and `project-visibility-source-contract.test.ts`.
