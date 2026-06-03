---
title: Commercial Readiness Hardening - Backend OAuth Provider Payload Validation 2026-06-04
aliases:
  - Backend OAuth Provider Payload Validation
  - GitHub OAuth Response Validation
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend OAuth Provider Payload Validation 2026-06-04

## 결과

> [!success]
> Backend GitHub OAuth flow가 provider HTTP 장애뿐 아니라 provider의 malformed JSON/object payload, missing `access_token`, missing `id`를 명시적인 `GITHUB_OAUTH_RESPONSE_INVALID` 502 오류로 fail-closed 처리합니다.

## 문제

- 기존 OAuth provider 호출은 `httpx` transport/status failure를 503으로 변환했지만, GitHub가 성공 HTTP status로 비정상 payload를 반환하는 경우를 충분히 계약화하지 않았습니다.
- token exchange 응답에 `access_token`이 없거나 user payload가 object가 아니거나 `id`가 비어 있어도 이후 로직에서 암묵적으로 진행될 위험이 있었습니다.

## 구현

- `agentfeed-backend/app/services/auth.py`
  - `_github_oauth_response_invalid(stage, field)` 추가.
  - `_github_json_object(response, stage)`로 token/user JSON object shape 검증.
  - `_required_github_provider_id(github_data)`로 GitHub user `id` 필수/비어있음/boolean 제외 검증.
  - `get_github_access_token()`이 missing/blank access token을 `GITHUB_OAUTH_RESPONSE_INVALID`로 처리.
  - `get_github_user()`가 non-object provider payload를 `GITHUB_OAUTH_RESPONSE_INVALID`로 처리.
  - `get_or_create_user()`가 DB query 전에 provider user id 계약을 검증.

## 검증

> [!example] Targeted
> `ruff check app/services/auth.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "github_access_token_exchange or github_user_fetch or github_login_rejects_missing_provider_id or github_login_reuses_active_provider_account_without_persisting_provider_tokens or github_login_creates_auth_account_without_persisting_provider_token"` → 7 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 376 passed, 1 warning

## 남은 리스크

> [!warning]
> 이 변경은 Backend OAuth provider payload 계약 보강입니다. Hosted production readiness는 여전히 `api.agentfeed.dev` DNS/deployment와 `https://agentfeed.dev/` stale `/login` redirect가 해결되어야 완료됩니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend OAuth Callback Token Non Retention 2026-06-03]]
- [[Commercial Readiness Hardening - Login Provider Token and Interactive Evidence Gates 2026-06-03]]
