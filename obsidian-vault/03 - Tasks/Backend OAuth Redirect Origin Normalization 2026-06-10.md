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
  - "[[Backend CLI Auth Authorize URL Origin Normalization 2026-06-10]]"
---

# Backend OAuth Redirect Origin Normalization 2026-06-10

## 배경

GitHub OAuth callback은 Backend에서 Frontend route로 redirect하는 핵심 browser auth 경계다.

CLI auth `authorize_url` 생성부는 trailing slash를 정규화했지만, OAuth callback redirect는 `settings.FRONTEND_URL`과 `next_path`를 직접 이어 붙이고 있었다. `FRONTEND_URL=https://agentfeed.example/`처럼 설정되면 `/dashboard` redirect가 `https://agentfeed.example//dashboard`로 생성될 수 있었다.

## 변경

- `agentfeed-backend/app/routers/auth.py`
  - GitHub OAuth callback redirect URL을 `settings.FRONTEND_URL.rstrip("/") + next_path`로 생성.
- `agentfeed-backend/tests/test_github_oauth_redirect_url_contracts.py`
  - trailing slash가 있는 frontend origin에서도 OAuth callback redirect `Location`이 정확히 `/dashboard`가 되는 contract 추가.

## Contract

Backend-generated browser redirect URL은 다음을 보장해야 한다.

- `FRONTEND_URL`에 trailing slash가 있어도 route path는 단일 slash로 시작한다.
- OAuth `next_path`는 기존 `_safe_next_path`가 허용한 내부 route만 사용한다.
- 브라우저/프록시의 double-slash normalization에 의존하지 않는다.

## 검증

- Red 확인:
  - `uv run pytest tests/test_github_oauth_redirect_url_contracts.py -q` → 기존 구현에서 `https://agentfeed.example//dashboard`로 실패.
- Green 확인:
  - `uv run pytest tests/test_github_oauth_redirect_url_contracts.py tests/test_github_oauth_contracts.py tests/test_auth_contracts.py -q` → 35 passed.
  - `uv run ruff check app/routers/auth.py tests/test_github_oauth_redirect_url_contracts.py tests/test_github_oauth_contracts.py` → passed.
- 추가 확인:
  - `rg -n "FRONTEND_URL\\}\\{|FRONTEND_URL\\}" app tests` → 직접 결합 패턴 추가 잔존 없음.
- LOC 확인:
  - `app/routers/auth.py` → 212 pure LOC.
  - `tests/test_github_oauth_redirect_url_contracts.py` → 48 pure LOC.
  - `tests/test_github_oauth_contracts.py` → 242 pure LOC, 기존 파일에 추가하지 않고 새 파일로 분리.
- LSP diagnostics: `basedpyright-langserver` 미설치로 실행 불가.

## 후행 과제

- Backend-generated browser URL 정책을 공통 helper로 통합할지 검토한다. 현재는 scope를 좁혀 direct concatenation을 제거하는 데 한정했다.
