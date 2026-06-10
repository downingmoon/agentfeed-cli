---
type: task
status: done
created: 2026-06-10
tags:
  - agentfeed/contract
  - agentfeed/auth
repos:
  - agentfeed-backend
  - AgentFeed-CLI
related:
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Backend CLI Auth Authorize URL Origin Normalization 2026-06-10

## 배경

CLI browser login은 Backend가 발급한 `authorize_url`을 CLI가 그대로 브라우저에 열어 Frontend `/cli/authorize`로 이동한다.

Backend metadata endpoint는 `FRONTEND_URL.rstrip("/")`를 사용하지만 CLI auth session response는 `settings.FRONTEND_URL`을 직접 이어 붙이고 있었다. 운영/서버 테스트 환경에서 `FRONTEND_URL=https://frontend.example/`처럼 trailing slash가 들어가면 `https://frontend.example//cli/authorize?...`가 생성될 수 있었다.

## 변경

- `agentfeed-backend/app/cli_auth_sessions.py`
  - `_session_response()`에서 `settings.FRONTEND_URL.rstrip("/")`로 origin을 정규화한 뒤 `/cli/authorize`를 붙이도록 수정.
- `agentfeed-backend/tests/test_cli_auth_url_contracts.py`
  - trailing slash가 포함된 Frontend URL에서도 `authorize_url`이 정확히 `/cli/authorize`로 시작하고 `//cli/authorize`를 만들지 않는 contract 추가.

## Contract

Backend CLI auth create-session response의 `authorize_url`은 다음을 보장해야 한다.

- `FRONTEND_URL`에 trailing slash가 있어도 route path는 `/cli/authorize` 하나만 사용한다.
- session id와 status token은 query string에만 포함한다.
- `//cli/authorize`처럼 브라우저/프록시 정규화에 기대는 URL을 만들지 않는다.

## 검증

- Red 확인:
  - `uv run pytest tests/test_cli_auth_url_contracts.py -q` → 기존 구현에서 `https://frontend.example//cli/authorize?...`로 실패.
- Green 확인:
  - `uv run pytest tests/test_cli_auth_url_contracts.py tests/test_cli_auth_session_contracts.py tests/test_route_response_model_contracts.py -q` → 14 passed.
  - `uv run ruff check app/cli_auth_sessions.py tests/test_cli_auth_url_contracts.py tests/test_cli_auth_session_contracts.py` → passed.
- LOC 확인:
  - `app/cli_auth_sessions.py` → 94 pure LOC.
  - `tests/test_cli_auth_url_contracts.py` → 11 pure LOC.
  - `tests/test_cli_auth_session_contracts.py` → 239 pure LOC, 기존 파일에 추가하지 않고 새 파일로 분리.
- LSP diagnostics: `basedpyright-langserver` 미설치로 실행 불가.

## 후행 과제

- 다른 Backend-generated browser URL도 `FRONTEND_URL.rstrip("/")` 또는 동일 정책으로 정규화되는지 별도 pass에서 확인한다.
