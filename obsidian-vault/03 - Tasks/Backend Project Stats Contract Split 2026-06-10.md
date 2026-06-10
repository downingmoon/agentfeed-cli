---
title: Backend Project Stats Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - project-stats
status: done
---

# Backend Project Stats Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 project list stats hydration 및 private project stats aggregate 계약 테스트 3개를 `tests/test_project_stats_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Public project stats 계약은 이미 `test_project_public_stats_contracts.py`로 분리되었지만, list hydration/private aggregate 계약은 여전히 catch-all 파일에 남아 있었다.
- Project stats 관련 회귀가 발생했을 때 public privacy redaction과 private aggregate/list batching 실패 원인을 분리해 추적할 수 있어야 한다.
- 새 파일은 195 LOC로 유지해 이후 project stats 계약을 추가해도 파일 크기 한계에 여유가 있다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `agentfeed-backend/tests/test_project_stats_contracts.py`:

- `test_project_list_batches_stats_for_multiple_projects`
- `test_private_project_stats_use_single_db_aggregate`
- `test_private_project_stats_by_project_ids_use_grouped_db_aggregate`

## Size

```text
5208 tests/test_contracts.py
 195 tests/test_project_stats_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'project_list_batches_stats_for_multiple_projects or private_project_stats_use_single_db_aggregate or private_project_stats_by_project_ids_use_grouped_db_aggregate'
# baseline before move: 3 passed, 192 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_project_stats_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_project_stats_contracts.py
# 3 passed in 0.34s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved project stats tests>'
# 192 deselected / 0 selected, expected pytest exit 5 after move
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.66s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
```

```text
bash scripts/test-all.sh
# CLI: 591 passed; typecheck; release preflight; audit 0 vulnerabilities
# Frontend: typecheck; mock API compatibility; production build; audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Follow-up

- [ ] Split user public stats and user activity date-range contracts next.
- [ ] Keep public project privacy aggregate tests in `test_project_public_stats_contracts.py`.
- [ ] Keep private/list project stats tests in `test_project_stats_contracts.py`.
- [ ] Do not deploy from this enterprise-readiness pass unless explicitly overridden by the user.
