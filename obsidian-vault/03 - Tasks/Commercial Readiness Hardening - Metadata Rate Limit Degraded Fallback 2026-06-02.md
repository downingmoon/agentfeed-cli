---
title: Commercial Readiness Hardening - Metadata Rate Limit Degraded Fallback 2026-06-02
aliases:
  - Backend metadata rate-limit degraded fallback
  - Rate-limit store unavailable metadata fallback
tags:
  - agentfeed/backend
  - agentfeed/commercial-readiness
  - reliability
  - security
status: completed
created: 2026-06-02
completed: 2026-06-02
related:
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - Backend Rate Limit Store Fail Closed 2026-06-01]]"
---

# Commercial Readiness Hardening - Metadata Rate Limit Degraded Fallback 2026-06-02

## 목적

Rate-limit durable store가 일시적으로 실패할 때 전체 서비스가 불필요하게 막히지 않도록 하되, auth/ingest/write/public DB-backed traffic은 기존처럼 fail-closed로 보호한다.

> [!important]
> Degraded fallback allowlist는 `GET /v1/metadata` 하나로 고정했다. 이 endpoint는 static compatibility metadata만 반환하므로 CLI/Frontend 배포 호환성 진단을 유지할 수 있다.

## 변경

- Backend `check_rate_limit_async()`가 durable store 실패 시 `GET /v1/metadata`만 process-local in-memory fallback으로 재시도한다.
- Fallback 성공/차단 응답에는 `X-RateLimit-Degraded: true`를 붙여 운영 관측 가능성을 유지한다.
- Auth, ingest, health/readiness, feed 등 모든 non-metadata route는 `RATE_LIMIT_STORE_UNAVAILABLE` 503 fail-closed를 유지한다.
- Allowlist exactness와 non-metadata fail-closed regression을 테스트로 고정했다.

## 검증

- [x] `uv run --locked --group dev ruff check app/main.py app/middleware/rate_limit.py tests/test_rate_limit_store.py tests/test_contracts.py`
- [x] `uv run --locked --group dev pytest tests/test_rate_limit_store.py tests/test_contracts.py -k 'rate_limit_store or degraded_rate_limit or health_rate_limit or health_routes_return_rate_limit_contract'`
- [x] `uv run --locked --group dev pytest` — 311 passed
- [x] `../agentfeed-dev/scripts/test-all.sh` — CLI 338 tests, Frontend CI/build, Backend 311 tests, OpenAPI/dev gates passed

## 남은 외부 블로커

- `api.agentfeed.dev` DNS/deployment가 아직 준비되지 않아 hosted commercial readiness는 여전히 외부 배포 작업이 필요하다.
