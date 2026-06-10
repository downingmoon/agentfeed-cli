---
type: task
status: done
created: 2026-06-10
tags:
  - agentfeed/contract
  - agentfeed/auth
repos:
  - agentfeed-backend
  - agentfeed-frontend
  - AgentFeed-CLI
related:
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Backend OAuth Redirect Origin Normalization 2026-06-10]]"
---

# Backend OAuth Next Allowlist Parity 2026-06-10

## 배경

GitHub OAuth `next` state는 Frontend가 로그인 시작 시 안전한 내부 경로를 보존하고, Backend가 callback에서 다시 검증한 뒤 최종 redirect로 사용하는 cross-repo contract다.

Frontend의 `src/lib/auth-next.ts`는 `/feed?tag=...&scope=...`와 `/moderation/reports`를 안전한 로그인 후 이동 경로로 보존한다. Backend `app/oauth_state.py`의 allowlist는 이 변경을 따라가지 못해 다음 문제가 있었다.

- `/feed?tag=cli&scope=following` → Backend에서 `/feed`로 축소됨.
- `/moderation/reports` → Backend에서 `/dashboard`로 fallback됨.

즉 사용자가 안전한 Frontend deep-link에서 GitHub OAuth를 시작해도, Backend sanitizer가 동일 contract를 보존하지 않아 이동 의도가 사라질 수 있었다.

## 변경

- `agentfeed-backend/app/oauth_state.py`
  - `ALLOWED_AUTH_NEXT_EXACT_PATHS`에 `/moderation/reports` 추가.
  - `/feed` query allowlist에 `tag`, `scope` 추가.
- `agentfeed-backend/tests/test_auth_contracts.py`
  - `/feed?tag=cli&scope=following&token=secret` → `/feed?tag=cli&scope=following` contract 추가.
  - `/moderation/reports?token=secret` → `/moderation/reports` contract 추가.

## Contract

Backend OAuth state sanitizer는 Frontend OAuth next helper가 허용한 안전한 signed-in route와 query key를 동일하게 보존해야 한다.

- 민감 query key(`token`, `access_token`, `state` 등)는 제거한다.
- Frontend에서 보존하는 안전 query key는 Backend에서도 보존한다.
- Frontend에서 허용하는 안전 exact path는 Backend에서도 fallback 없이 보존한다.
- 알 수 없는 외부 URL, protocol-relative URL, dot-segment path는 계속 차단한다.

## 검증

- Red 확인:
  - `/feed?tag=cli&scope=following&token=secret` 테스트 추가 후 기존 구현에서 기대값 `/feed?tag=cli&scope=following`, 실제값 `/feed`로 실패.
  - `/moderation/reports?token=secret` 테스트 추가 후 기존 구현에서 기대값 `/moderation/reports`, 실제값 `/dashboard`로 실패.
- Green 확인:
  - Backend: `uv run pytest tests/test_auth_contracts.py tests/test_github_oauth_contracts.py tests/test_github_oauth_redirect_url_contracts.py -q` → 37 passed.
  - Backend lint: `uv run ruff check app/oauth_state.py tests/test_auth_contracts.py` → passed.
  - Frontend contract: `npm run test:contracts` → passed.
- LOC 확인:
  - `app/oauth_state.py` → 206 pure LOC.
  - `tests/test_auth_contracts.py` → 171 pure LOC.
- LSP diagnostics:
  - `basedpyright-langserver` 미설치로 실행 불가.

## 후행 과제

> [!todo]
> OAuth next allowlist drift가 재발하면 Frontend/Backend가 공유하거나 생성할 수 있는 단일 source-of-truth contract를 검토한다. 이번 작업에서는 새 기능을 만들지 않고 drift 제거에만 한정했다.
