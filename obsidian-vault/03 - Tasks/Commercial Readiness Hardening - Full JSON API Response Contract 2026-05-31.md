---
title: Full JSON API Response Contract
aliases:
  - Backend Route Response Model Completion
  - API Response Model Contract
created: 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/api
  - agentfeed/integration
status: done
---

# Full JSON API Response Contract

## 목표

Frontend/CLI가 소비하는 Backend JSON API route가 OpenAPI에서 shape drift를 일으키지 않도록, redirect/의도적 deprecated endpoint를 제외한 `/v1` route에 `response_model`을 부여했습니다.

> [!important]
> Response model을 추가할 때는 실제 반환 payload를 기준으로 schema를 만들었습니다. 기존 schema가 필드를 drop할 수 있는 경우에는 새 schema를 추가했고, field 이름은 Backend/DB 실제 반환 계약을 기준으로 정렬했습니다.

## 구현 요약

- Project route contract:
  - `ProjectResponse`, `UserProjectSummary`, `ProjectDetail`, `ProjectStats`를 실제 반환 field와 정렬했습니다.
  - `owner`, `stats`, canonical stats key(`worklog_count`, `total_files`, `total_lines_added`, `total_tests`)를 보존합니다.
- Search/Explore aggregate contract:
  - `SearchResponse`, `ExploreSection`과 section item schema를 추가했습니다.
  - Worklog card, project summary, prompt, rising builder, category aggregate shape를 고정합니다.
- Notification contract:
  - `NotificationTarget`은 `extra=allow`로 둬 payload의 `username` 같은 navigation key가 response filtering으로 사라지지 않게 했습니다.
  - read/read-all mutation response를 명시했습니다.
- Integration contract:
  - integration status와 setup guide step schema를 추가했습니다.
- Auth/CLI session + ingest contract:
  - logout, CLI browser auth session create/approve/exchange, ingest worklog/preview response를 명시했습니다.

## 의도적으로 untyped로 남긴 route

- `GET /v1/auth/github` — OAuth provider redirect
- `GET /v1/auth/github/callback` — browser cookie set + Frontend redirect
- `POST /v1/ingest/token/rotate` — deprecated 403-only endpoint, 기존 OpenAPI disabled contract 유지

## 검증 증거

- Untyped route audit:
  - `.venv/bin/python - <<'PY' ... APIRoute response_model audit ... PY` → 위 3개 route만 남음
- Backend targeted contract:
  - `.venv/bin/pytest tests/test_contracts.py -q -k 'remaining_app_routes_have_response_models_or_intentional_redirects or project_search_explore_notification_integration_and_ingest_routes_have_response_models'` → `2 passed, 198 deselected`
- Backend full:
  - `.venv/bin/pytest -q` → `214 passed, 1 warning`
- Backend lint/static:
  - `.venv/bin/ruff check ...` → pass
  - `.venv/bin/python - <<'PY' ... app.openapi() ... PY` → OpenAPI generation pass, `/v1/projects` schema `$ref` 확인
  - `git diff --check` → pass
- Frontend contract:
  - `npm run test:contracts` in `agentfeed-frontend` → pass

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Full JSON API response model contract]]
- [[Commercial Readiness Hardening - User Dashboard Worklog Contracts and Collect JSON Stability 2026-05-31]]
- [[Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31]]
