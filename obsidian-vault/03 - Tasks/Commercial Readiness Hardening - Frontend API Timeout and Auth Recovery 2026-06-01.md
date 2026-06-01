---
title: Commercial Readiness Hardening - Frontend API Timeout and Auth Recovery 2026-06-01
aliases:
  - Frontend API timeout and auth recovery
  - 2026-06-01 frontend timeout auth CTA
  - Frontend production trust copy
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/runtime
  - agentfeed/auth
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Frontend API Timeout and Auth Recovery 2026-06-01

> [!abstract] 목적
> Frontend 상용 UX에서 API 요청이 무기한 대기하거나, auth recovery CTA가 클릭돼도 아무 동작을 하지 않거나, public surface가 preview/demo처럼 보이는 신뢰 저하를 줄입니다.

## 발견한 gap

- `src/lib/api.ts`의 공통 `apiFetch()`는 브라우저 `fetch`에 timeout/AbortSignal을 걸지 않았습니다.
- Settings auth-error branch의 `GitHub 로그인으로 이동` 버튼은 `redirectToSignInForCurrentRoute`를 호출했지만, 이 helper는 `authError` 상태에서 no-op입니다.
- Landing/Footer public copy에 `v0.1`, `v0.1.0-preview`, tool-stack badge copy가 남아 있어 상용 public surface 신뢰를 낮췄습니다.

## 수정

- `API_REQUEST_TIMEOUT_MS = 15_000`을 추가하고, 모든 `apiFetch()` 요청에 timeout `AbortSignal`을 적용했습니다.
- timeout으로 abort된 요청은 safe `ApiError(504)`로 변환해 UI가 bounded failure path를 탈 수 있게 했습니다.
- Settings auth-error branch는 `redirectToSignInAfterAuthError()`를 통해 직접 GitHub OAuth URL로 이동하고 현재 route/query/hash를 `authNextPath()`로 보존합니다.
- Landing hero pill과 Footer version copy에서 preview/demo 표현을 제거했습니다.
- Source/contract tests가 timeout signal, timeout failure, Settings CTA wiring, preview copy removal을 고정합니다.

## 검증 증거

- Frontend: `npm run test:contracts` → passed
- Frontend: `npm run lint` → passed
- Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → passed
- Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run ci` → passed
- Cross-repo: `agentfeed-dev ./scripts/test-all.sh` → CLI 285 passed, Frontend CI/build passed, Backend 263 passed + Alembic offline chain passed

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend API timeout and auth recovery]]
- [[Runtime Configuration#2026-06-01 Frontend API timeout and auth recovery]]
- [[Active Tasks]]
