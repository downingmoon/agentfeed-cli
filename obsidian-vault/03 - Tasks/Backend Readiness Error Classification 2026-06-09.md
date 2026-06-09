---
title: Backend Readiness Error Classification
date: 2026-06-09
tags:
  - agentfeed/backend
  - quality/error-handling
  - contracts
  - healthcheck
status: done
related:
  - [[Health Readiness Status Contract Guard 2026-06-08]]
---

# Backend Readiness Error Classification 2026-06-09

> [!success] 완료
> `/health/ready`에서 migration revision lookup 실패가 `database.error`로 분류되던 문제를 `migration.error`로 옮기고, readiness error code를 Pydantic `Literal` 계약으로 닫았다.

## 문제

기존 readiness 흐름은 DB 연결은 성공했지만 Alembic revision 조회가 실패한 경우에도 다음처럼 응답했다.

```json
{
  "database": { "connected": true, "revision": null, "error": "migration_revision_unavailable" },
  "migration": { "head": "...", "up_to_date": false, "error": null }
}
```

영향:

- 운영자가 DB 연결 문제와 migration 상태 문제를 혼동할 수 있음.
- `database.error` / `migration.error`가 모두 `str | null`이라 잘못된 error code가 섞여도 schema에서 차단되지 않음.

## 변경 사항

- `agentfeed-backend/app/main.py`
  - revision lookup 실패 및 missing revision을 `migration_error = "migration_revision_unavailable"`로 분류.
  - `database.error`는 DB connectivity 실패에만 사용.
- `agentfeed-backend/app/schemas/common.py`
  - `DatabaseReadiness.error`를 `Literal["database_connectivity_failed"] | None`으로 제한.
  - `MigrationReadiness.error`를 `Literal["migration_revision_unavailable", "migration_head_unavailable"] | None`으로 제한.
- `agentfeed-backend/tests/test_contracts.py`
  - revision lookup failure 응답 기대값 갱신.
  - database/migration error code 교차 오염을 Pydantic validation failure로 고정.
  - ruff import 정렬도 함께 적용.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
.venv/bin/pytest tests/test_contracts.py -q -k 'health_and_readiness_status_contracts_are_closed or readiness_reports_revision_lookup_failures_safely or readiness_ok_with_database_and_migration_match or readiness_returns_503_when_database_unavailable or readiness_reports_migration_head_failures_safely'
.venv/bin/ruff check app tests
.venv/bin/pytest -q

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- Backend targeted readiness tests: `5 passed`
- Backend ruff: 통과
- Backend full pytest: `426 passed`
- Dev OpenAPI contract gate: 통과

## 서버/배포

> [!warning]
> active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후행 과제

- 운영 대시보드/프론트엔드에서 readiness 세부 error code를 직접 노출하는 화면은 현재 범위가 아니다.
- 만약 health diagnostics UI가 필요해지면 신규 기능으로 별도 문서화 후 진행해야 한다.
