---
title: Commercial Readiness Hardening - Backend Rate Limit Store Fail Closed 2026-06-01
aliases:
  - Backend Rate Limit Store Fail Closed
  - RATE_LIMIT_STORE_UNAVAILABLE
  - Rate Limit Degraded Mode
  - Backend Rate Limit Fail Closed
tags:
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Backend Rate Limit Store Fail Closed 2026-06-01

## 목적

Production/shared database rate-limit store 장애가 발생했을 때 process-local memory bucket으로 조용히 downgrade하지 않고, 요청을 fail-closed로 차단하면서 운영자가 식별 가능한 degraded 상태로 노출하도록 고정했습니다.

> [!danger]
> Multi-instance production에서 DB rate-limit store 장애를 in-memory fallback으로 허용하면 instance별 quota가 분리되어 auth/ingest/social mutation rate-limit 우회가 가능합니다. 이 경로는 이제 `RATE_LIMIT_STORE_UNAVAILABLE`로 명시 차단합니다.

## 수정 요약

- `check_rate_limit_async()`의 broad exception fallback을 제거했습니다.
- Store exception 발생 시 `RateLimitDecision(limited=True, degraded=True, error_code="RATE_LIMIT_STORE_UNAVAILABLE")`를 반환합니다.
- Degraded decision은 `503` + `Retry-After` + `RATE_LIMIT_STORE_UNAVAILABLE` JSON envelope로 응답합니다.
- Error log에 `bucket_name`, `rate_limit_degraded=True`, stack trace를 남겨 운영 관측성을 확보했습니다.
- 기존 정상 quota 초과는 계속 `429 RATE_LIMITED`를 유지합니다.

## 계약

- 정상 rate-limit 초과: `429 RATE_LIMITED`.
- Rate-limit store unavailable: `503 RATE_LIMIT_STORE_UNAVAILABLE`.
- 두 응답 모두 `Retry-After`를 포함합니다.
- Request ID middleware를 통과한 degraded 응답은 `X-Request-ID`를 유지합니다.
- Store 장애 로그에는 raw identity/token을 남기지 않고 normalized `bucket_name`만 남깁니다.

## TDD 기록

> [!bug] RED
> `tests/test_rate_limit_store.py`에서 기존 process-local fallback 기대를 fail-closed 기대값으로 바꿨고, 첫 실행은 `RateLimitDecision.error_code`가 없어 실패했습니다.

> [!success] GREEN
> `RateLimitDecision`에 degraded/error metadata를 추가하고, `RateLimitStoreUnavailable` error contract 및 middleware response propagation을 연결했습니다.

> [!example] Reviewer gap closure
> 별도 verifier가 실제 middleware 경로에서 failing store를 주입하는 통합 테스트를 제안해 `test_rate_limit_store_failure_through_middleware_fails_closed_and_logs`를 추가했습니다.

## 검증 증거

- RED:
  - `uv run pytest tests/test_rate_limit_store.py::test_database_rate_limit_store_failure_fails_closed_and_is_observable -q`
  - 결과: expected failure `AttributeError: 'RateLimitDecision' object has no attribute 'error_code'`
- Backend targeted/full gates:
  - `uv run ruff check app/middleware/rate_limit.py app/exceptions.py app/main.py tests/test_rate_limit_store.py tests/test_contracts.py` → passed
  - `uv run pytest tests/test_rate_limit_store.py tests/test_contracts.py::test_rate_limit_store_unavailable_response_is_degraded_and_request_id tests/test_contracts.py::test_rate_limit_store_failure_through_middleware_fails_closed_and_logs tests/test_contracts.py::test_request_rate_limit_uses_normalized_path_and_response_contract -q` → 12 passed
  - `uv run pytest -q` → 228 passed, 1 warning
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과
- Parallel review:
  - verifier subagent verdict: PASS, no blocking issues

## 남은 리스크

> [!note]
> 실제 배포 환경에서 PostgreSQL 장애를 유발한 multi-instance live smoke는 실행하지 않았습니다. 현재 검증은 failing store 주입, middleware integration, full backend tests, cross-repo static/integration gate 기준입니다.

## 관련 링크

- [[Auth & Credential Safety#2026-06-01 Backend rate-limit store fail-closed degraded mode]]
- [[Integration - CLI Backend Frontend#2026-06-01 Backend rate-limit store fail-closed degraded mode]]
- [[Active Tasks#P1 후보]]
