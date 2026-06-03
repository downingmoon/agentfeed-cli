---
title: Backend OAuth Callback Token Non Retention
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/oauth
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Commercial Readiness Hardening - Frontend CLI Authorize Transient Retry 2026-06-03]]"
---

# Backend OAuth Callback Token Non Retention

## 목표

GitHub OAuth callback 전체 경로에서 provider access/refresh token이 DB나 audit metadata에 남지 않는다는 계약을 회귀 테스트로 고정한다.

> [!success]
> callback이 기존 auth account의 legacy provider token 값을 가진 상태로 성공해도 `access_token_encrypted`와 `refresh_token_encrypted`가 `None`으로 clear되고, audit metadata에는 callback token/legacy token이 포함되지 않도록 테스트를 추가했다.

## 변경

- `agentfeed-backend/tests/test_contracts.py`
  - `test_github_callback_clears_legacy_provider_tokens_on_success` 추가.
  - 실제 router `github_callback()`에서 token exchange/user fetch만 mock하고 `get_or_create_user()`는 실제 구현을 사용한다.
  - 기존 auth account row의 `gho_legacy_access`/`ghr_legacy_refresh`가 callback 후 clear되는지 확인한다.
  - `auth.login` audit metadata에 transient callback token과 legacy token이 없는지 확인한다.

## 검증

```bash
./.venv/bin/pytest -q tests/test_contracts.py -k 'github_callback_clears_legacy_provider_tokens_on_success or github_callback_sets_api_wide_session_cookie_and_clears_state or github_login_reuses_active_provider_account_without_persisting_provider_tokens'
./.venv/bin/pytest -q
```

결과:

- targeted OAuth tests: 3 passed
- full backend suite: 357 passed, 1 existing Starlette/httpx deprecation warning

## 남은 리스크

- hosted 상용 readiness는 여전히 외부 배포/DNS에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
