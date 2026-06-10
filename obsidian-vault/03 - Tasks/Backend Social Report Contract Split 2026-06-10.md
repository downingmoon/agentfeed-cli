---
title: Backend Social Report Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - social
  - reports
status: done
---

# Backend Social Report Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 흩어져 있던 social report 계약 테스트 4개를 `tests/test_social_report_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Report creation, private target protection, reason validation, duplicate report idempotency는 social/report 도메인의 핵심 계약이다.
- `tests/test_contracts.py`의 catch-all 성격을 줄여 contract failure 원인 추적을 빠르게 한다.
- 새 파일은 106 LOC로 작고 독립 실행 가능하다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `agentfeed-backend/tests/test_social_report_contracts.py`:

- `test_private_worklog_comment_report_is_not_creatable_by_other_users`
- `test_report_request_rejects_invalid_reason_with_pydantic_validation`
- `test_reports_are_unique_per_reporter_and_target`
- `test_duplicate_worklog_report_is_idempotent_on_unique_conflict`

## Size

```text
6199 tests/test_contracts.py
 106 tests/test_social_report_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'private_worklog_comment_report_is_not_creatable_by_other_users or report_request_rejects_invalid_reason_with_pydantic_validation or reports_are_unique_per_reporter_and_target or duplicate_worklog_report_is_idempotent_on_unique_conflict'
# baseline before move: 4 passed, 218 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_social_report_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_social_report_contracts.py
# 4 passed
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Classified backend-only operations: 5
```

```text
bash scripts/test-all.sh
# CLI: 28 files / 591 tests passed, typecheck, release preflight, audit 0 vulnerabilities
# Frontend: typecheck/lint, contract tests, mock API compatibility, production build, audit 0 vulnerabilities
# Backend: ruff, 428 tests passed, alembic offline migration chain generated
```

## Follow-up

- [ ] Split remaining follow/bookmark social graph tests from `tests/test_contracts.py`.
- [ ] Continue worklog privacy/review/public-detail contract decomposition.
- [ ] Keep new contract files below ~250 LOC where practical.
