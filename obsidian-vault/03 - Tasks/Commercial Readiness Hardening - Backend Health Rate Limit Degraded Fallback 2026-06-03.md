---
title: Backend Health Rate Limit Degraded Fallback
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/readiness
  - agentfeed/rate-limit
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Runtime Configuration]]"
---

# Backend Health Rate Limit Degraded Fallback

## 목표

rate-limit durable store 장애가 `/health`와 `/health/ready`의 인프라 신호를 가리지 않게 하면서, auth/ingest/feed 같은 사용자·쓰기 경로는 기존처럼 fail-closed로 유지한다.

> [!success]
> degraded fallback allowlist에 health/readiness endpoints를 추가했고, readiness가 rate-limit store 장애 중에도 실제 database/migration 상태를 반환한다는 회귀 테스트를 추가했다.

## 변경

- `agentfeed-backend/app/middleware/rate_limit.py`
  - `RATE_LIMIT_DEGRADED_FALLBACK_PATHS`에 `GET /health`, `GET /v1/health`, `GET /health/ready`, `GET /v1/health/ready` 추가.
  - `GET /v1/metadata` 기존 allowlist는 유지.
- `agentfeed-backend/tests/test_contracts.py`
  - health/readiness는 rate-limit store 장애에서도 route handler까지 도달하고 `X-RateLimit-Degraded: true`를 반환하는 계약 추가.
  - auth/CLI session/ingest/feed는 계속 `RATE_LIMIT_STORE_UNAVAILABLE`로 fail-closed임을 유지.
- `agentfeed-backend/tests/test_rate_limit_store.py`
  - degraded fallback allowlist exact contract를 health/readiness 포함으로 갱신.

## 검증

```bash
./.venv/bin/pytest -q \
  tests/test_contracts.py::test_rate_limit_store_failure_keeps_non_metadata_routes_fail_closed \
  tests/test_contracts.py::test_rate_limit_store_failure_allows_metadata_with_degraded_fallback_header \
  tests/test_contracts.py::test_rate_limit_store_failure_allows_health_with_degraded_fallback_header \
  tests/test_contracts.py::test_rate_limit_store_failure_allows_readiness_to_report_database_state \
  tests/test_rate_limit_store.py::test_degraded_rate_limit_fallback_allowlist_is_exact_and_method_bound
./.venv/bin/pytest -q
```

결과:

- targeted rate-limit/readiness tests: 11 passed
- backend full pytest: 359 passed, 1 existing Starlette/httpx deprecation warning

## 남은 리스크

- hosted 상용 readiness는 여전히 외부 배포/DNS에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
