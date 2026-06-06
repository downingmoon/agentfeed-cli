---
title: Frontend UI UX Polish Stage 3 2026-06-06
date: 2026-06-06
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - project/evidence
status: completed
related:
  - "[[Frontend UI UX Polish Stage 1 2026-06-06]]"
  - "[[Frontend UI UX Polish Stage 2 2026-06-06]]"
  - "[[Active Tasks]]"
---

# Frontend UI UX Polish Stage 3 2026-06-06

## 목표

서버 데이터가 비어 있거나 API 연결이 실패한 상황에서도 feed 화면이 미완성으로 보이지 않도록 zero-data/error state를 productized했다.

## 변경 요약

- Feed main area의 auth-check, auth-required, API-error, empty-result state를 공통 `FeedStatePanel`로 정리했다.
- Empty feed에서 다음 행동을 제공한다.
  - Following empty: Public feed로 돌아가기.
  - Public empty/filter empty: 필터 초기화.
- Trending/Rising builders/Hot categories sidebar가 빈 배열일 때도 짧은 안내문을 표시하도록 `SidebarEmpty`를 추가했다.
- Landing preview label을 CSS class로 분리하고 모바일에서는 숨겨 작은 화면의 off-canvas label rough edge를 제거했다.

## 검증 evidence

- `npm run lint`: 통과.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`: 통과.
- Playwright browser smoke:
  - `http://127.0.0.1:3101/feed` desktop snapshot 확인.
  - 390×844 mobile snapshot 확인.
  - 확인 후 Playwright page close, Next dev server 종료.
  - 잔여 `next dev`, `playwright-mcp`, `@playwright/mcp` 프로세스 없음 확인.

> [!warning] Smoke 환경 메모
> Local frontend dev server에서 개인 서버 API를 직접 호출하면 CORS/compatibility alert가 뜬다. 이는 `127.0.0.1:3101` origin이 서버 test env의 allowed origin이 아니기 때문이며, 이번 stage에서는 해당 error layout과 sidebar empty 렌더링을 확인했다.

## 다음 stage 후보

- 실제 서버 frontend origin 또는 local docker compose origin에서 feed success state를 다시 시각 확인.
- Worklog detail/review, Settings authenticated form, Projects create/edit modal을 실제 로그인 상태로 keyboard/focus smoke.
