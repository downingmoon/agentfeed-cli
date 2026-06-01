---
title: Commercial Readiness Hardening - Session Logout Revocation Smoke 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/dev
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Session logout revocation smoke
  - Browser logout session cutoff smoke
---

# Commercial Readiness Hardening - Session Logout Revocation Smoke 2026-06-01

> [!success]
> Authenticated account DOM smoke 다음 단계로, 브라우저 cookie 기반 logout이 실제 Backend session cutoff까지 반영되고 Frontend가 실패한 logout을 local signed-out illusion으로 처리하지 않도록 보강했습니다.

## 발견한 gap

- Backend는 `POST /v1/auth/logout`에서 `access_token` cookie를 삭제하고 `users.session_revoked_at`을 기록합니다.
- Backend auth dependency는 JWT `iat`/`iat_ms`가 `session_revoked_at` 이전 또는 같은 token을 거부합니다.
- Dev smoke는 authenticated browser DOM까지 검증했지만, logout 후 동일 cookie/JWT가 실제로 거부되는지는 검증하지 않았습니다.
- Frontend `signOut()`은 `auth.logout()` 실패를 삼킨 뒤 local state를 signed-out으로 지웠습니다. 이 경우 네트워크/API 실패 시 cookie가 남아 있는데 UI만 로그아웃된 것처럼 보일 수 있습니다.

## 결과

- Frontend `AppContext.signOut()`이 Backend logout 성공 후에만 local auth/social state를 지웁니다.
- Logout API failure는 `SessionActionBanner`로 app-level alert를 렌더링하고, 기존 signed-in state를 유지합니다.
- Dev `smoke-e2e.sh`가 browser-cookie mutation으로 `POST /v1/auth/logout`을 호출합니다.
  - CSRF contract와 맞게 `Origin: $FRONTEND_URL`을 포함합니다.
  - `Set-Cookie: access_token=... Max-Age=0; Path=/; HttpOnly; SameSite=lax` 계열의 clear-cookie header를 검증합니다.
  - 같은 token을 cookie와 bearer 양쪽으로 `GET /v1/auth/me`에 재사용했을 때 모두 `401`인지 검증합니다.
- Dev `test-all.sh`가 logout revocation smoke block이 제거되지 않도록 static gate를 추가했습니다.

## Product contract

> [!important]
> 로그아웃은 UI 상태 변경이 아니라 서버 세션 무효화가 성공했다는 보안 계약입니다. Backend logout이 실패하면 Frontend는 사용자가 여전히 authenticated 상태일 수 있음을 알려야 하며, smoke는 old browser JWT가 더 이상 인증되지 않음을 증명해야 합니다.

## 변경 파일

- Frontend: `src/contexts/AppContext.tsx`
- Frontend: `src/lib/page-source-contract.test.ts`
- Dev: `scripts/smoke-e2e.sh`
- Dev: `scripts/test-all.sh`

## 검증 증거

- Frontend: `npm run test:contracts` → passed.
- Frontend: `npm run lint` → passed.
- Backend targeted: `uv run pytest tests/test_contracts.py -k "logout or session_revoked"` → 3 passed.
- Dev static/syntax: `bash -n scripts/smoke-e2e.sh && node --check scripts/browser-dom-dump.mjs && git diff --check` → passed.
- Dev live smoke: `make smoke-e2e` → passed.
  - `== Verifying browser logout revokes the seeded session ==`
  - `== E2E smoke passed ==`
- Cross-repo: `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 20 files / 272 tests passed, typecheck, release preflight, npm audit.
  - Frontend: typecheck, contract tests, production build, npm audit.
  - Backend: ruff, 246 tests passed, Alembic offline migration chain.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Session logout revocation smoke]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Authenticated Frontend Account Smoke 2026-06-01]]
- [[Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31]]
