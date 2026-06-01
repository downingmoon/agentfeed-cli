---
title: Frontend Auth Expiry Social Cleanup
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/social-actions
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Frontend Auth Expiry Social Cleanup

> [!success]
> 401/auth-expiry 이벤트가 sign-out과 동일하게 auth-scoped optimistic social state와 pending maps를 정리하도록 고정했습니다.

## 배경

Frontend risk scan에서 `AUTH_ERROR_EVENT_NAME` 처리 경로가 `currentUser`/`signedIn`만 지우고, like/bookmark optimistic state와 pending maps는 sign-out 경로에서만 정리한다는 차이를 확인했습니다.

이 상태가 남으면 token expiry 이후 새 로그인 전후에 다음 문제가 생길 수 있습니다.

- 이전 사용자 세션의 optimistic like/bookmark state가 UI에 남음.
- pending map이 남아 버튼이 잠긴 상태처럼 보일 수 있음.
- social action error banner가 새 auth flow까지 이어질 수 있음.

## 변경 사항

- `src/contexts/AppContext.tsx`
  - `clearAuthBoundSocialState()` helper로 like/bookmark values, pending refs/state, social action error cleanup을 중앙화했습니다.
  - `AUTH_ERROR_EVENT_NAME` handler가 해당 helper를 호출합니다.
  - `signOut()`도 같은 helper를 재사용합니다.
  - 초기 `auth.me()`에서 unusable identity/401 auth category/API config error가 발생해 signed-out 상태가 될 때도 auth-scoped social state를 정리합니다.
- `src/lib/page-source-contract.test.ts`
  - cleanup helper 존재를 고정했습니다.
  - 401 handler와 sign-out이 같은 cleanup path를 사용하는지 고정했습니다.

## Regression contract

> [!example]
> 새 source contract는 구현 전 `AppContext must centralize cleanup for auth-scoped social state`로 먼저 실패했고, 구현 후 통과했습니다.

계약:

- 401/auth-expiry event → current user/sign-in state clear + social optimistic state clear.
- sign-out → same cleanup helper reuse.
- unusable `auth.me()` payload 또는 auth category error → signed-out state와 social state가 함께 정리됨.

## 검증 증거

> [!example] Frontend
> - `npm run test:contracts` → failed first on the new cleanup contract
> - `npm run test:contracts` → passed after implementation
> - `npm run lint` → passed
> - `git diff --check` → passed
> - `npm run ci` → passed

> [!example] Cross-repo
> - `make test` in `agentfeed-dev` → passed
> - OpenAPI operations checked: 69
> - Client contracts checked: 66 (`cli`: 6, `frontend`: 60)
> - AgentFeed CLI tests: 264 passed
> - Frontend CI/build/audit gate passed
> - Backend pytest: 226 passed, 1 warning
> - Alembic offline migration chain generated successfully

## 후속 판단

> [!note]
> 이번 턴 초기에 dynamic auth-next query 보존을 확인했지만, 현재 실제 query-bearing surfaces는 `/feed`, `/search`, `/projects`, `/leaderboard`, `/cli/authorize`처럼 exact allowlist에 이미 묶여 있습니다. `/worklogs/.../review` 등 dynamic route는 현재 safe query state를 사용하지 않아, 즉시 수정 impact는 401 cleanup보다 낮다고 판단했습니다.

## 관련 링크

- [[Commercial Readiness Hardening - Frontend CSP Style Inline Hardening 2026-06-01]]
- [[Commercial Readiness Hardening - Settings Token Revoke Confirmation 2026-06-01]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks]]
