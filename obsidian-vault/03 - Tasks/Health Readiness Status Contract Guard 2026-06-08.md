---
title: Health Readiness Status Contract Guard 2026-06-08
aliases:
  - Health Readiness Status Contract Guard
status: completed
tags:
  - agentfeed/todo
  - agentfeed/contract
  - agentfeed/backend
created: 2026-06-08
updated: 2026-06-08
---

# Health Readiness Status Contract Guard 2026-06-08

## 목적

Backend health/readiness response의 `status` 필드가 broad `string`으로 열려 있어, `/health` 또는 `/health/ready`가 계약 밖 상태값을 반환해도 schema 단계에서 잡히지 않는 문제를 제거했다.

> [!success] 완료 판정
> Health는 `ok`, readiness는 `ready | not_ready`만 허용하도록 Backend schema와 regression test를 고정했다.

## 변경 내용

- Backend `HealthResponse.status`
  - `str = "ok"` → `Literal["ok"] = "ok"`.
- Backend `ReadinessResponse.status`
  - broad `str` → `Literal["ready", "not_ready"]`.
- Backend regression test 추가.
  - `HealthResponse`가 `healthy` 같은 unknown status를 reject하는지 확인.
  - `ReadinessResponse`가 `ready`, `not_ready`만 허용하고 `degraded`를 reject하는지 확인.

## 검증

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_health_and_readiness_status_contracts_are_closed tests/test_contracts.py::test_rate_limit_store_failure_allows_health_with_degraded_fallback_header tests/test_contracts.py::test_readiness_ok_with_database_and_migration_match tests/test_contracts.py::test_readiness_returns_503_when_database_unavailable`
  - `uv run ruff check app/schemas/common.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest`: 412 passed, 1 warning
  - `uv run ruff check .`: passed
- Frontend:
  - `npm run test:contracts`: passed
  - `npm run lint`: passed
- CLI:
  - `npm run release:preflight`: 27 files, 568 tests passed

## 후행 과제

> [!note]
> 이번 작업은 운영 readiness 상태값을 새로 추가하지 않고 existing status contract를 닫는 hardening이다.

- 만약 추후 `degraded`, `maintenance` 같은 readiness 상태가 필요하면 신규 운영 상태 모델로 간주하고 Obsidian spec에서 먼저 결정한다.
- Frontend/CLI가 readiness body를 직접 의미 있게 소비하게 되면 같은 literal set을 client-side parser에도 추가한다.

## 관련 문서

- [[Active Tasks]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
