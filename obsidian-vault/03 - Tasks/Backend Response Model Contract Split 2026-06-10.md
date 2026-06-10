---
title: Backend Response Model Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/response-models
  - agentfeed/quality
status: done
---

# Backend Response Model Contract Split 2026-06-10

> [!success]
> Frontend가 의존하는 route response model, public schema extra-field, dashboard/count 응답 계약 테스트 10개를 `tests/test_contracts.py`에서 작은 전용 파일 3개로 분리했다. 기능 변경 없이 계약 소유권과 회귀 추적성을 개선했다.

## 목적

`tests/test_contracts.py`에 route 응답 모델, public schema strictness, count 음수 차단 계약이 한 덩어리로 남아 있었다. Enterprise 완성도 관점에서는 CLI-Frontend-Backend 계약 실패가 발생했을 때 어떤 API surface가 깨졌는지 즉시 좁힐 수 있어야 한다. 이번 패스는 해당 계약을 250 lines 미만의 작은 파일들로 나누어 유지보수성과 리뷰 가능성을 높였다.

## 변경 사항

Backend 신규 테스트 파일:

- `tests/test_route_response_model_contracts.py` — 225 lines
- `tests/test_public_schema_response_model_contracts.py` — 247 lines
- `tests/test_dashboard_count_response_model_contracts.py` — 155 lines

`tests/test_contracts.py`에서 이동한 테스트:

- `test_high_traffic_routes_have_response_models`
- `test_public_discovery_routes_have_response_models`
- `test_social_and_comment_routes_have_response_models`
- `test_profile_dashboard_and_worklog_routes_have_response_models`
- `test_user_and_project_response_models_reject_extra_fields`
- `test_remaining_public_response_models_reject_extra_fields`
- `test_remaining_app_routes_have_response_models_or_intentional_redirects`
- `test_project_search_explore_notification_integration_and_ingest_routes_have_response_models`
- `test_dashboard_and_search_response_models_reject_extra_fields`
- `test_public_count_response_schemas_reject_negative_values`

## 보존한 계약

- 모든 주요 FastAPI route는 의도한 `response_model`을 유지한다.
- OAuth redirect route만 response model 없는 route로 허용된다.
- Public/User/Project/Auth/Social/Notification/Integration/Explore/Search/Dashboard schema는 extra field를 거부한다.
- Public count field는 음수를 거부하고 optional 공개 metric의 `None`은 유지한다.
- Frontend mock compatibility가 확인하는 `/feed`, `/search`, `/tags`, `/explore`, `/projects`, `/settings`, `/notifications` API surface와 일치한다.

## 검증 증거

Pre-split 기준선:

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'high_traffic_routes_have_response_models or public_discovery_routes_have_response_models or social_and_comment_routes_have_response_models or profile_dashboard_and_worklog_routes_have_response_models or user_and_project_response_models_reject_extra_fields or remaining_public_response_models_reject_extra_fields or remaining_app_routes_have_response_models_or_intentional_redirects or project_search_explore_notification_integration_and_ingest_routes_have_response_models or dashboard_and_search_response_models_reject_extra_fields or public_count_response_schemas_reject_negative_values'
10 passed, 261 deselected in 0.59s
```

Focused split 검증:

```text
uv run --locked --group dev pytest tests/test_route_response_model_contracts.py tests/test_public_schema_response_model_contracts.py tests/test_dashboard_count_response_model_contracts.py
10 passed in 0.66s
```

Backend 전체 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_route_response_model_contracts.py tests/test_public_schema_response_model_contracts.py tests/test_dashboard_count_response_model_contracts.py
All checks passed!

uv run --locked --group dev pytest
428 passed, 1 warning in 1.82s
```

Cross-repo 검증:

```text
node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh
AgentFeed OpenAPI contract gate passed.
CLI: 28 files / 591 tests passed, typecheck/release preflight/audit passed
Frontend: typecheck, contract tests, mock API compatibility, production build, audit passed
Backend: ruff passed, 428 passed, Alembic offline migration chain passed
```

## 후속 과제

> [!todo]
> 다음 후보는 `rate limit identity / request boundary` 영역의 남은 테스트와 `integration setup guide` 계약이다. 이미 일부 전용 파일이 있으므로 중복 소유권 없이 더 작은 파일로 나눌 수 있는지 먼저 확인한다.

> [!info]
> 이번 패스에서는 신규 기능 추가와 서버 배포를 하지 않았다.
