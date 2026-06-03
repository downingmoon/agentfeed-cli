---
title: Frontend CLI Authorize Transient Retry
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/cli-login
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Commercial Readiness Hardening - CLI Auth Status Token Logout Recovery and Hook Settings 2026-06-02]]"
---

# Frontend CLI Authorize Transient Retry

## 목표

`agentfeed login` 브라우저 승인 화면이 일시적인 API/network 오류에서 즉시 멈추지 않고 자동 복구되도록 한다.

> [!success]
> `/cli/authorize` 화면이 408/429/5xx 및 transport 오류를 transient로 분류하고, capped exponential backoff로 자동 재시도한다. 사용자는 error copy에서 자동 재시도 중임을 볼 수 있고, 기존 수동 retry 버튼도 유지된다.

## 변경

- `agentfeed-frontend/src/components/pages/CliAuthorizePage.tsx`
  - `CLI_AUTH_TRANSIENT_RETRY_BASE_MS = 1_000`, `CLI_AUTH_TRANSIENT_RETRY_MAX_MS = 10_000` 추가.
  - `isTransientCliAuthorizeError()`로 transport/408/429/5xx를 retryable로 분류.
  - `transientRetryDelayMs()`로 deterministic capped exponential backoff 적용.
  - session/auth 성공 후 transient attempt를 reset.
  - transient 실패 copy에 “잠시 후 자동으로 다시 확인합니다.”를 표시.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - retry 상수, transient classifier, capped backoff, scheduled silent retry, copy contract를 고정.

## Backend OAuth token lifecycle 병렬 분석 결과

- `app/routers/auth.py` callback은 GitHub provider token을 `fetch_github_user()`에만 transient로 사용한다.
- `app/services/auth.py:get_or_create_user()`는 existing/new auth account 모두 provider access/refresh token을 저장하지 않거나 `None`으로 clear한다.
- `alembic/versions/023_nullable_provider_access_token.py`는 GitHub provider token column을 nullable로 만들고 기존 GitHub token 값을 purge한다.
- 추가 backend 기능 패치 필요성은 낮다. 남길 수 있는 hardening은 “full callback path에서 legacy provider token이 callback 이후 `None`이 되는지” CI regression test 정도다.

## 검증

```bash
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 npm run ci
```

결과:

- contract tests passed
- `tsc --noEmit` passed
- production dependency audit: 0 vulnerabilities
- mock API compatibility: `FRONTEND_API_PROBES_PASSED metadata feed tags explore`
- production build passed

## 남은 리스크

- hosted 상용 readiness는 여전히 외부 배포/DNS에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
