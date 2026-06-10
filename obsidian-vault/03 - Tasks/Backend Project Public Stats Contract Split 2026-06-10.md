---
title: Backend Project Public Stats Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - project-stats
status: done
---

# Backend Project Public Stats Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 public project stats privacy aggregate 계약 테스트 3개를 `tests/test_project_public_stats_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Project stats 계약은 public/private aggregate, list hydration, privacy redaction이 catch-all 파일에 섞여 있었다.
- 이번 pass는 공개 프로젝트 통계의 privacy redaction/visibility filter 계약을 먼저 독립시켜 회귀 원인을 좁혔다.
- 새 파일은 133 LOC로 유지해 이후 private/list project stats 분리를 이어가기 쉽다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `agentfeed-backend/tests/test_project_public_stats_contracts.py`:

- `test_public_project_stats_exclude_unpublished_worklogs`
- `test_public_project_stats_respect_author_metric_privacy`
- `test_public_project_stats_by_project_ids_use_grouped_privacy_aggregate`

## Size

```text
5389 tests/test_contracts.py
 133 tests/test_project_public_stats_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'public_project_stats_exclude_unpublished_worklogs or public_project_stats_respect_author_metric_privacy or public_project_stats_by_project_ids_use_grouped_privacy_aggregate'
# baseline before move: 3 passed, 195 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_project_public_stats_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_project_public_stats_contracts.py
# 3 passed in 0.34s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved public project stats tests>'
# 195 deselected / 0 selected, expected pytest exit 5 after move
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.68s
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

- [ ] Split private project stats and project-list stats hydration contracts into a separate small file.
- [ ] Split user public stats and user activity date-range contracts next.
- [ ] Keep future public project privacy aggregate tests in `test_project_public_stats_contracts.py`.
- [ ] Do not deploy from this enterprise-readiness pass unless explicitly overridden by the user.
