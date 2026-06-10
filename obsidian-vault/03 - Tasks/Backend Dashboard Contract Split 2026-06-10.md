---
title: Backend Dashboard Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - dashboard
  - frontend-contract
status: done
---

# Backend Dashboard Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 dashboard 계약 테스트 3개를 `tests/test_dashboard_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Dashboard는 Frontend가 직접 소비하는 `/me/dashboard/*` 계열 계약 경계다.
- Recent worklog action URL은 review/public 상태별 라우팅 안정성에 직결된다.
- Summary count batching은 대시보드 카드 수치와 Backend 집계가 어긋나지 않게 하는 핵심 계약이다.
- Catch-all 파일에서 분리해 dashboard 변경 시 회귀 위치를 더 빠르게 찾을 수 있게 했다.

## Changed

- `agentfeed-backend/tests/test_dashboard_contracts.py`
  - `test_dashboard_recent_action_url_contract_is_internal_worklog_path`
  - `test_dashboard_recent_worklogs_return_status_aware_action_urls`
  - `test_dashboard_summary_batches_status_counts`
- `agentfeed-backend/tests/test_contracts.py`
  - dashboard 테스트 3개 제거

## Size

```text
3220 tests/test_contracts.py
 123 tests/test_dashboard_contracts.py
3343 total
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_dashboard_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_dashboard_contracts.py
# 3 passed in 0.71s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved dashboard tests>'
# 121 deselected / 0 selected, exit_code=5
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 2.79s
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

- [ ] Continue decomposing `tests/test_contracts.py` by project CRUD, search/discovery, and user/profile ownership.
- [ ] Keep future dashboard route/action URL/count aggregation tests in `test_dashboard_contracts.py`.
- [ ] Keep dashboard response-model count validation in `test_dashboard_count_response_model_contracts.py` unless the file exceeds the size limit.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
