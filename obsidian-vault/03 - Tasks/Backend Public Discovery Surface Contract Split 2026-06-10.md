---
title: Backend Public Discovery Surface Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - discovery
  - search
  - projects
status: done
---

# Backend Public Discovery Surface Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 public discovery/search/project surface 계약 테스트 4개를 `tests/test_public_discovery_surface_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Public discovery surface는 Frontend `/search`, `/explore`, `/projects`, profile project list가 공유하는 API-visible contract다.
- Soft-deleted owner/author filtering, owner avatar propagation, cursor pagination, search worklog card shape가 섞이면 회귀 원인과 영향 범위를 빠르게 좁히기 어렵다.
- Enterprise-readiness 목표상, 신규 기능보다 기존 public discovery 계약을 독립 파일로 고정해 CLI-API-Frontend 간 불일치 탐지력을 높이는 것이 우선이다.

## Changed

- `agentfeed-backend/tests/test_public_discovery_surface_contracts.py`
  - `test_search_worklog_result_uses_frontend_card_contract`
  - `test_project_public_surfaces_filter_soft_deleted_owners_and_authors`
  - `test_search_and_explore_surfaces_filter_soft_deleted_authors_and_owners`
  - `test_user_projects_returns_cursor_pagination_metadata`
- `agentfeed-backend/tests/test_contracts.py`
  - public discovery/search/project surface 테스트 4개 제거

## Size

```text
2531 tests/test_contracts.py
 216 tests/test_public_discovery_surface_contracts.py
2747 total
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved public discovery tests>'
# baseline before split: 4 passed, 102 deselected in 0.72s
```

```text
uv run --locked --group dev pytest tests/test_public_discovery_surface_contracts.py
# 4 passed in 0.41s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved public discovery tests>'
# 102 deselected / 0 selected, exit_code=5 after split
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_public_discovery_surface_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.90s
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

- [ ] Continue decomposing `tests/test_contracts.py` by user/profile ownership and shared schema/model boundaries.
- [ ] Keep future public search/explore/project list surface tests in `test_public_discovery_surface_contracts.py`.
- [ ] Keep search-indexing privacy tests in `test_search_discovery_privacy_contracts.py` to avoid mixing query privacy with UI surface shape.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
