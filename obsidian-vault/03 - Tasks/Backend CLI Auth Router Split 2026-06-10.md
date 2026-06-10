---
title: Backend CLI Auth Router Split 2026-06-10
aliases:
  - Backend CLI Auth Router Split
status: done
tags:
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/cli
  - agentfeed/contract
  - agentfeed/refactor
  - agentfeed/verification
updated: 2026-06-10
---

# Backend CLI Auth Router Split 2026-06-10

> [!success] 결론
> Backend `app/routers/auth.py`에서 CLI browser-login session 생성/조회/승인/교환 책임을 분리했다. 공개 API 경로는 `/v1/auth/cli/...` 그대로 유지하면서, GitHub/browser auth router와 terminal session exchange router의 책임을 분리했다.

## 변경 범위

- Backend `app/routers/cli_auth.py`
  - `/auth/cli/sessions`
  - `/auth/cli/sessions/{session_id}`
  - `/auth/cli/sessions/{session_id}/approve`
  - `/auth/cli/sessions/{session_id}/exchange`
  - 위 4개 CLI auth HTTP endpoint를 소유.
- Backend `app/cli_auth_sessions.py`
  - CLI auth request models, approval-code/status-token helpers, session response helpers, active-session guard를 분리.
- Backend `app/routers/auth.py`
  - GitHub OAuth, browser session cookie, `/auth/me`, `/auth/logout` 중심으로 축소.
- Backend `app/main.py`
  - `cli_auth.router`를 기존 `PREFIX` 아래에 include해 실제 route contract를 유지.
- Backend tests
  - `auth.router`가 `/cli/*` endpoint를 소유하지 않고 `cli_auth.router`가 `/auth/cli/*` endpoint를 소유한다는 source/router ownership contract 추가.
  - CLI auth direct tests import를 새 책임 모듈 기준으로 갱신.
  - shared schema boundary test의 CLI request model import를 `app.cli_auth_sessions`로 갱신.

## Contract rule

```text
Public paths stay /v1/auth/cli/*.
GitHub/browser auth and CLI terminal session exchange must not live in the same route module.
```

> [!warning] 유지 규칙
> CLI login flow는 CLI-API-Frontend 계약의 핵심 경계다. 라우트 경로와 response model은 유지하되, route ownership과 helper location은 분리된 모듈 기준으로 관리한다.

## Verification evidence

- Red 확인:
  - `uv run pytest tests/test_auth_contracts.py::test_cli_auth_session_routes_are_owned_by_cli_auth_router -q` → `app.routers.cli_auth`가 없어 실패.
- Targeted:
  - `uv run pytest tests/test_auth_contracts.py tests/test_cli_auth_session_contracts.py tests/test_cli_auth_exchange_contracts.py tests/test_shared_schema_boundary_contracts.py tests/test_route_response_model_contracts.py tests/test_github_oauth_contracts.py tests/test_provider_token_contracts.py -q` → `64 passed`.
- Full backend:
  - `uv run pytest -q` → `434 passed, 1 warning`.
  - `uv run ruff check .` → pass.
- Manual HTTP/router smoke:
  - `uv run python` + `TestClient(app, raise_server_exceptions=False)`:
    - `/health` → `200 application/json`.
    - `/v1/metadata` → `200 application/json`.
    - registered CLI routes:
      - `/v1/auth/cli/sessions` `POST`
      - `/v1/auth/cli/sessions/{session_id}` `GET`
      - `/v1/auth/cli/sessions/{session_id}/approve` `POST`
      - `/v1/auth/cli/sessions/{session_id}/exchange` `POST`
- LOC check:
  - `app/routers/auth.py` → 212 logical lines.
  - `app/routers/cli_auth.py` → 198 logical lines.
  - `app/cli_auth_sessions.py` → 93 logical lines.
  - `app/oauth_state.py` → 205 logical lines.
- Not tested:
  - LSP diagnostics: local `basedpyright-langserver` is not installed.

## Follow-up

> [!todo]
> Next backend cleanup slice can split browser cookie/session helpers from `app/routers/auth.py` if future auth changes grow the file again. Current touched auth modules are below the 250 logical-LOC target.

> [!todo]
> The persistent Starlette/FastAPI TestClient warning recommends `httpx2`; this is tooling/dependency work, not part of this no-new-feature slice.

## Related

- [[Backend OAuth State Parser Boundary Guard 2026-06-10]]
- [[Backend Readiness Broad Catch Guard 2026-06-10]]
- [[CLI API JSON Boundary Guard 2026-06-10]]
