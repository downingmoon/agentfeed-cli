---
title: Frontend Interaction Pending Guards
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/ux
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Frontend Interaction Pending Guards

> [!success]
> Landing hero preview와 Feed rising-builders sidebar의 user-visible interaction을 local-only illusion / duplicate mutation에서 API-backed pending-aware flow로 보강했습니다.

## 배경

상용 UI는 버튼을 눌렀을 때 실제 저장되는지, 이미 요청 중인지, 실패했을 때 어디서 복구되는지를 명확히 해야 합니다. 직전 병렬 gap scan에서 Landing hero preview의 like/bookmark가 local state만 바꾸고, Feed rising-builders follow가 per-user pending lock 없이 중복 요청될 수 있음이 확인되었습니다.

## 변경 계약

### Landing hero preview

- like/bookmark는 `useApp()`의 shared social maps와 `toggleLike` / `toggleBookmark`를 사용합니다.
- count와 selected state는 `getWorklogSocialState()`로 계산해 card/detail과 같은 viewer-state delta 규칙을 따릅니다.
- like/bookmark pending 상태에서는 버튼이 disabled + `aria-busy`가 됩니다.
- share는 `shareWorklogLink()` / `shareWorklogResultMessage()`를 사용합니다.
- share는 `sharePendingRef`로 synchronous duplicate launch를 차단하고, 결과를 `role="status"`로 표시합니다.

### Feed rising builders

- username별 follow pending map과 ref guard를 추가했습니다.
- 같은 username에 대해 요청 중이면 추가 follow/unfollow request를 시작하지 않습니다.
- API success response의 `following` 값을 최종 상태로 저장합니다.
- 실패 시 optimistic state를 rollback하고 sidebar action-level error를 표시합니다.

> [!warning]
> Landing preview는 더 이상 local-only like/bookmark 숫자 illusion을 만들지 않습니다. Signed-out 사용자는 기존 shared social action 규칙에 따라 GitHub sign-in flow로 이동합니다.

## 수정 파일

- Frontend
  - `src/components/pages/LandingPage.tsx`
  - `src/components/pages/FeedPage.tsx`
  - `src/lib/page-source-contract.test.ts`

## 검증 증거

- `npm run test:contracts` → passed
- `npm run lint` → passed
- `npm run ci` → passed, production build completed
- `agentfeed-dev make test` → passed

## 후속 후보

- Frontend user-visible interaction E2E coverage 확대
- CLI timeout-after-server-success idempotency confirmation
- CLI publish provenance dry-run gate 강화

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend interaction pending guards]]
- [[Active Tasks#P1 후보]]
