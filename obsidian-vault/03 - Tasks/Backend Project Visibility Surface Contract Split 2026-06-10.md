---
title: Backend Project Visibility Surface Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - project
  - visibility
  - surface
status: done
---

# Backend Project Visibility Surface Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 project visibility/privacy masking 및 frontend-facing project surface 계약 테스트 8개를 dedicated files로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Project visibility는 DB 제약, Backend schema, public worklog card masking, direct project view authorization이 함께 맞물리는 privacy boundary다.
- Project surface는 Frontend `/projects`, search result owner-scoped link, profile project slug lookup과 직접 연결되는 contract boundary다.
- 두 영역이 catch-all `test_contracts.py`에 남아 있으면 CLI-API-Frontend 계약 회귀 원인을 빠르게 좁히기 어렵다.
- Enterprise-readiness 목표상, 기능 추가보다 기존 계약을 더 작은 책임 단위로 고정해 회귀 탐지력을 높이는 것이 우선이다.

## Changed

- `agentfeed-backend/tests/test_project_visibility_contracts.py`
  - `test_project_slug_has_active_owner_unique_index`
  - `test_project_visibility_schema_rejects_unknown_values`
  - `test_non_public_project_metadata_is_masked_on_public_worklog_cards`
  - `test_project_direct_visibility_fails_closed_for_unknown_values`
- `agentfeed-backend/tests/test_project_surface_contracts.py`
  - `test_projects_list_route_exists_for_frontend_wrapper`
  - `test_project_summary_includes_stats_for_frontend_projects_page`
  - `test_search_project_result_includes_owner_for_owner_scoped_frontend_links`
  - `test_user_project_slug_lookup_is_deterministic_when_duplicates_preexist`
- `agentfeed-backend/tests/test_contracts.py`
  - project visibility/surface 테스트 8개 제거

## Size

```text
2724 tests/test_contracts.py
 123 tests/test_project_visibility_contracts.py
 122 tests/test_project_surface_contracts.py
2969 total
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved project visibility/surface tests>'
# baseline before split: 8 passed, 106 deselected in 0.67s
```

```text
uv run --locked --group dev pytest tests/test_project_visibility_contracts.py tests/test_project_surface_contracts.py
# 8 passed in 0.71s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved project visibility/surface tests>'
# 106 deselected / 0 selected, exit_code=5 after split
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_project_visibility_contracts.py tests/test_project_surface_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 2.06s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Strict client JSON error responses checked: 347
# Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false
```

```text
bash scripts/test-all.sh
# CLI: 591 passed; typecheck; release preflight; npm audit 0 vulnerabilities
# Frontend: typecheck; mock API compatibility; production build; npm audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Follow-up

- [ ] Continue decomposing `tests/test_contracts.py` by search/discovery, user/profile ownership, and shared schema/model boundaries.
- [ ] Keep future project visibility/privacy masking tests in `test_project_visibility_contracts.py`.
- [ ] Keep future `/projects`, search project result, and user project slug lookup tests in `test_project_surface_contracts.py`.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
