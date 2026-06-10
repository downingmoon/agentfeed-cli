---
title: Backend Shared Schema Boundary Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - enterprise-readiness
aliases:
  - 2026-06-10 shared schema boundary split
---

# Backend Shared Schema Boundary Contract Split 2026-06-10

> [!success]
> Backend의 과밀한 `tests/test_contracts.py`에서 shared schema/model boundary 성격의 테스트 4개를 별도 파일로 분리했고, CLI-Frontend-Backend 통합 게이트까지 통과했다.

## Why

`tests/test_contracts.py`는 여러 도메인의 계약 테스트가 누적되어 2,000 LOC 이상으로 커졌다. Enterprise 완성도 관점에서는 테스트가 단순히 많기보다, 실패 지점과 소유권이 명확해야 한다. 이번 패스는 기능 변경 없이 shared schema/default/request fail-closed 계약을 독립 파일로 분리해 유지보수성과 회귀 추적성을 높였다.

## Changed

Backend commit: `73513be Split shared schema boundary contracts`

- Added `agentfeed-backend/tests/test_shared_schema_boundary_contracts.py` (`118 LOC`)
- Reduced `agentfeed-backend/tests/test_contracts.py` from `2086 LOC` to `1978 LOC`
- Moved these contract tests without behavior changes:
  - `test_schema_models_do_not_use_mutable_literal_defaults`
  - `test_discovery_query_filter_contracts_are_literal_typed`
  - `test_frontend_and_cli_request_schemas_fail_closed_for_unknown_fields`
  - `test_privacy_settings_visibility_defaults_reject_unknown_values`

## Verification Evidence

Backend targeted checks:

```text
uv run --locked --group dev pytest tests/test_shared_schema_boundary_contracts.py
# 4 passed

uv run --locked --group dev pytest tests/test_contracts.py -k '<moved test names>'
# 84 deselected / 0 selected, exit 5 expected after move

uv run --locked --group dev ruff check tests/test_contracts.py tests/test_shared_schema_boundary_contracts.py
# All checks passed

uv run --locked --group dev pytest
# 428 passed, 1 warning
```

Cross-repo contract/readiness gate:

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false
# Schema field contracts checked: 184 fields across 36 operations

bash scripts/test-all.sh
# CLI: 28 files / 591 tests passed, typecheck, release preflight, npm audit 0 vulnerabilities
# Frontend: typecheck, mock API compatibility, production build, npm audit 0 vulnerabilities
# Backend: ruff, 428 passed, alembic offline migration chain captured
```

## Follow-up

> [!todo]
> `tests/test_contracts.py`는 아직 `1978 LOC`로 크다. 다음 분리 후보는 아래 묶음이다.

- worklog source / privacy sanitization normalization tests
- production settings and startup preflight tests
- worklog create/project-id routing boundary tests
- audit event persistence/request-id tests

> [!note]
> 이번 패스는 신규 기능을 추가하지 않았고, 서버 배포도 하지 않았다. 이전 개인서버 배포는 사용자 명시 요청에 따른 별도 예외였으며 이 목표의 기본 보류 원칙은 유지된다.
