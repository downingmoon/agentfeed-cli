---
title: Backend Project Create Update Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - project
  - crud
  - audit
status: done
---

# Backend Project Create Update Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 project create/update 계약 테스트 7개를 dedicated files로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Project 생성/수정은 Frontend projects page, CLI ingest project association, Backend audit event가 동시에 걸리는 계약 경계다.
- Slug 충돌 재시도, default visibility, nullable field clearing, explicit null 무시 규칙이 catch-all에 섞여 있으면 회귀 원인을 찾기 어렵다.
- Create와 update를 분리해 CRUD 계약의 책임 경계를 명확히 했다.

## Changed

- `agentfeed-backend/tests/test_project_update_contracts.py`
  - `test_update_project_request_distinguishes_omitted_fields_from_explicit_nulls`
  - `test_update_project_allows_explicit_null_clear_for_nullable_fields`
  - `test_update_project_null_clear_does_not_touch_omitted_nullable_fields`
  - `test_update_project_ignores_explicit_null_for_non_nullable_fields`
- `agentfeed-backend/tests/test_project_create_contracts.py`
  - `test_create_project_retries_slug_suffix_after_unique_race`
  - `test_create_project_uses_user_default_visibility_when_omitted`
  - `test_ingest_project_create_race_reuses_existing_project_after_unique_conflict`
- `agentfeed-backend/tests/test_contracts.py`
  - project create/update 테스트 7개 제거

## Size

```text
2943 tests/test_contracts.py
 183 tests/test_project_update_contracts.py
 127 tests/test_project_create_contracts.py
3253 total
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_project_update_contracts.py tests/test_project_create_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_project_update_contracts.py tests/test_project_create_contracts.py
# 7 passed in 0.35s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved project create/update tests>'
# 114 deselected / 0 selected, exit_code=5
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.64s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false
```

```text
bash scripts/test-all.sh
# CLI: 591 passed; typecheck; release preflight; npm audit 0 vulnerabilities
# Frontend: typecheck; contract tests; mock API compatibility; production build; npm audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Follow-up

- [ ] Continue decomposing `tests/test_contracts.py` by project visibility/lookup, search/discovery, and user/profile ownership.
- [ ] Keep future project create/default visibility/slug race tests in `test_project_create_contracts.py`.
- [ ] Keep future project update/null clearing/audit tests in `test_project_update_contracts.py`.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
