---
title: Frontend Feed Filter Keyboard Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 feed filter keyboard assertion move
---

# Frontend Feed Filter Keyboard Assertion Move 2026-06-19

> [!success]
> `feed-filter-keyboard.contract.test.ts`의 feed filter keyboard source-contract assertion orchestration을 새 `feed-filter-keyboard-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/feed-filter-keyboard.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/feed-filter-keyboard-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: UI source contract assertions만 이동했고 `FeedPage.tsx` 런타임/UI를 변경하지 않아 생략

## Changes

- `feed-filter-keyboard.contract.test.ts`는 `assertFeedFilterKeyboardContracts()` runner만 호출하도록 축소했다.
- Trigger/option refs, keyboard open keys, option arrow/enter/escape handling, focus return, and `aria-expanded` source-contract assertions는 `feed-filter-keyboard-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npx tsc --noEmit` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `feed-filter-keyboard.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `feed-filter-keyboard-assertions.ts`: 21 pure LOC, 24 total LOC
- LSP diagnostics: local LSP transport returned `Transport closed`; `npm run lint` and `npx tsc --noEmit` passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `11f8850` — `Move feed filter keyboard assertions`

## Follow-up

> [!todo]
> Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Candidate `collection-evidence-malformed.contract.test.ts` handled in [[Frontend Collection Evidence Malformed Assertion Move 2026-06-20]]. Current next re-scan candidate: `api-json-boundary.contract.test.ts` at 8 pure LOC.

> [!todo]
> Keep feed filter keyboard source-contract assertions in `feed-filter-keyboard-assertions.ts`; keep the focused runner at `feed-filter-keyboard.contract.test.ts` slim.
