---
title: Commercial Readiness Hardening - Dashboard Saved Bookmarks Surface 2026-06-02
aliases:
  - Dashboard saved bookmarks surface
  - Saved worklogs dashboard section
  - Frontend bookmarked cards surface
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/social
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Dashboard Saved Bookmarks Surface 2026-06-02

> [!success] 목표
> Backend `/v1/me/bookmarks` API와 Frontend API client만 존재하던 saved/bookmarked worklog 기능을 Dashboard 사용자 화면으로 연결해, 저장한 worklog와 followed-author 상태를 실제 제품 표면에서 확인할 수 있게 합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#계약 기준]]
- 선행 API 계약: [[Commercial Readiness Hardening - Bookmark Follow State Contract 2026-06-02]]

## 변경 범위

- `agentfeed-frontend/src/components/pages/DashboardPage.tsx`
  - Dashboard bootstrap request를 `Promise.allSettled([me.dashboardSummary(), me.dashboardRecentWorklogs(8), me.bookmarks({ limit: 4 })])`로 확장.
  - `/me/bookmarks` rows를 `adaptWorklogCards`로 normalize.
  - Saved worklogs 섹션을 `WorklogCard` 기반으로 렌더링.
  - `viewerState.followingAuthor`가 true인 saved card에 `Following author` badge 표시.
  - saved fetch 실패는 `savedError`로 section-level 표시하고 summary/recent content를 blank하지 않음.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Dashboard가 saved/bookmark API를 isolated secondary request로 호출하는지 고정.
  - saved rows가 shared adapter/social-state/WorklogCard surface를 거치는지 고정.
  - followed-author viewer state가 사용자-visible badge로 노출되는지 고정.

## 고정된 계약

- Frontend는 `/v1/me/bookmarks`를 단순 API client로만 남기지 않고 signed-in Dashboard에서 실제로 소비해야 합니다.
- Saved/bookmarked card는 Backend `viewer_state.bookmarked`와 `viewer_state.following_author`를 adapter를 통해 보존해야 합니다.
- Saved fetch 실패는 Dashboard 전체 실패로 승격하지 않고 section-local failure로 처리해야 합니다.

## 검증 증거

- RED: `npm run test:contracts` 실패.
  - 실패 원인: Dashboard가 `/me/bookmarks`를 isolated request로 호출하지 않음.
- RED: `npm run test:contracts` 실패.
  - 실패 원인: saved card가 `viewerState.followingAuthor`를 surface하지 않음.
- GREEN: `npm run test:contracts` 통과.
- GREEN: `npm run lint` 통과.
- GREEN: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` 통과.
  - Typecheck, contract tests, production build passed.
- GREEN: `agentfeed-dev ./scripts/test-all.sh` 통과.
  - OpenAPI contract gate passed.
  - CLI: 314 tests passed, typecheck passed, release preflight passed, dependency audit passed.
  - Frontend: typecheck, contract tests, production build, dependency audit passed.
  - Backend: ruff passed, 284 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 이 변경은 Dashboard signed-in surface를 정렬합니다. 실제 브라우저에서 authenticated cookie를 주입해 Saved 섹션의 hydrated DOM을 확인하는 live smoke는 후속 hardening으로 추가할 수 있습니다.
