---
title: Deprecated Ingest Rotate Error Response Contract 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - contracts
  - openapi
  - error-envelope
status: done
related:
  - "[[AgentFeed Current Product Brief]]"
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
  - "[[Leaderboard Worklog Strict Response Boundary 2026-06-09]]"
---

# Deprecated Ingest Rotate Error Response Contract

> [!success] 완료
> `/v1/ingest/token/rotate`는 deprecated endpoint이며 성공 응답을 만들지 않고 항상 browser-approved rotation을 요구하는 `403` error envelope를 반환한다. 기존에는 route `response_model`이 없어 OpenAPI/route contract 스캔에서 예외로 관리되고 있었다.

## 변경

- Backend `app/routers/ingest.py`
  - deprecated token-authenticated rotation route에 `response_model=ErrorResponse` 명시.
- Backend `tests/test_contracts.py`
  - 해당 route가 `ErrorResponse` contract를 갖는지 고정.
  - `/v1` route 중 response model이 없는 endpoint는 OAuth redirect 2개만 허용하도록 축소.

## 검증

- [x] Targeted route tests
  - `uv run pytest tests/test_contracts.py::test_ingestion_status_route_exists_for_cli_doctor_token_check tests/test_contracts.py::test_remaining_app_routes_have_response_models_or_intentional_redirects tests/test_contracts.py::test_project_search_explore_notification_integration_and_ingest_routes_have_response_models tests/test_contracts.py::test_token_authenticated_rotation_requires_browser_session -q`
  - 결과: `4 passed`
- [x] Backend contract 전체
  - `uv run pytest tests/test_contracts.py -q`
  - 결과: `398 passed, 1 warning`
- [x] Untyped route 스캔
  - 남은 untyped `/v1` route: `/v1/auth/github`, `/v1/auth/github/callback`
  - 둘 다 browser redirect endpoint로 의도된 예외.
- [x] CLI API/doctor/auth 관련 smoke
  - `npm test -- --run tests/config.test.ts tests/cli-status-doctor.test.ts tests/api-hook.test.ts`
  - 결과: `190 passed`

## 후행 과제

> [!info]
> 이번 패스에서는 신규 기능을 추가하지 않았다. 서버/인프라/CICD 배포도 수행하지 않았다.
