---
title: Public Guest Auth Probe Cleanup 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/contracts
  - enterprise-readiness
aliases:
  - 2026-06-10 guest auth probe cleanup
---

# Public Guest Auth Probe Cleanup 2026-06-10

> [!success]
> Public feed/profile 같은 익명 접근 페이지에서 앱 부트스트랩이 무조건 `/v1/auth/me`를 호출해 브라우저 콘솔에 `401 Unauthorized` resource error를 남기던 UX/observability 결함을 계약 기반으로 보완했다.

## Why

`access_token`은 HttpOnly 쿠키라 frontend JavaScript가 읽을 수 없다. 기존 구조는 로그인 여부를 알기 위해 모든 페이지에서 `/auth/me`를 호출했고, 정상적인 익명 public 방문자도 401 콘솔 노이즈를 보게 되었다.

Enterprise 수준에서는 public guest path가 정상 상태인데도 콘솔에 오류가 남으면 안 된다. 단, marker를 권한 판단에 사용하면 안 되므로 backend authorization source는 계속 HttpOnly session + `/auth/me` 응답으로 유지했다.

## Changed

### Backend

Commit: `9abcc26 Mark browser sessions without probing guests`

- GitHub OAuth callback이 로그인 성공 시 비민감 marker cookie `agentfeed_browser_session=1`을 설정한다.
- marker cookie는 frontend probe hint 전용이다.
  - `HttpOnly` 아님
  - production에서는 `Secure`
  - `SameSite=lax`, `Path=/`
- logout은 `access_token`과 marker cookie를 함께 삭제한다.
- OAuth contract tests가 marker 설정/삭제/보안 플래그를 고정한다.

### Frontend

Commit: `a303c3e Skip guest auth probes on public pages`

- Added `src/lib/auth-session-marker.ts`
  - `shouldProbeAuthMeForRoute()`가 marker 또는 보호/recovery route에서만 `/auth/me` probe를 허용한다.
  - public anonymous route는 `/auth/me`를 호출하지 않는다.
  - stale marker가 있는 경우 `/auth/me` 401 시 marker를 삭제한다.
- AppContext bootstrap은 public guest route에서 auth probe를 skip한다.
- Protected routes(`/dashboard`, `/settings`, `/notifications`, `/moderation/reports`, `/worklogs/:id/review`)는 계속 `/auth/me`로 세션 회복/만료 상태를 확인한다.
- sign-out failure handling은 `catch {}`로 원인을 버리지 않고 `ApiError`/`TypeError`/generic `Error`별 사용자-visible copy를 만든다.
- Added `src/lib/auth-session-marker.contract.test.ts` and source-contract coverage.

## Verification Evidence

Backend targeted:

```text
uv run --locked --group dev pytest tests/test_github_oauth_contracts.py -k 'session_cookie or logout_clears'
# 2 passed, 5 deselected

uv run --locked --group dev ruff check app/routers/auth.py tests/test_github_oauth_contracts.py
# All checks passed

uv run --locked --group dev pytest tests/test_github_oauth_contracts.py tests/test_current_user_session_contracts.py
# 12 passed
```

Frontend targeted:

```text
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed

NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
NEXT_TELEMETRY_DISABLED=1 npm run build
# Next.js production build passed, 18 static pages generated
```

Cross-repo:

```text
uv run --locked --group dev pytest
# backend 428 passed, 1 warning

node scripts/check-openapi-contract.mjs
# 75 OpenAPI operations, 70 client contracts, 347 strict client JSON error responses checked

bash scripts/test-all.sh
# CLI 28 files / 591 tests, typecheck, release preflight, audit 0 vulnerabilities
# Frontend CI: typecheck, contract tests, mock API compatibility, production build, audit 0 vulnerabilities
# Backend: ruff, 428 passed, alembic offline migration chain captured
```

## Not Done

> [!note]
> Active goal rule에 따라 서버 배포는 하지 않았다.

## Follow-up

> [!todo]
> CLI authorize page는 미로그인 사용자의 pending session 확인 중 자체적으로 `auth.me`를 호출할 수 있다. public feed/profile 콘솔 노이즈는 해결했지만, CLI authorize UX도 같은 marker-first flow로 줄일 수 있는지 별도 pass에서 검토한다.

> [!todo]
> `src/contexts/AppContext.tsx`와 `src/lib/api.ts`는 여전히 큰 파일이다. 이번 pass에서는 auth marker helper를 분리했지만, 다음 cleanup pass에서 AppContext banner/session/social action 책임을 더 작게 나누는 것이 좋다.
