---
title: Backend Worklog Comment Like Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - worklog
  - comments
  - likes
status: done
---

# Backend Worklog Comment Like Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 worklog comment/like 상호작용 계약 테스트 9개를 dedicated files로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Comment/like는 공개 worklog의 사용자 상호작용 경계이므로 visibility, author setting, audit event, idempotent like 상태 변화가 한 파일에서 추적되어야 한다.
- 기존 catch-all 파일은 worklog schema, project, search, auth, social interaction 경계가 혼재되어 회귀 위치를 빠르게 찾기 어려웠다.
- Comment와 like를 분리해 파일 크기 상한과 책임 경계를 유지했다.

## Changed

- `agentfeed-backend/tests/test_worklog_comment_contracts.py`
  - `test_private_worklog_comments_are_not_readable_by_other_users`
  - `test_public_comments_query_filters_soft_deleted_authors`
  - `test_private_worklog_comments_are_not_creatable_by_other_users`
  - `test_comment_creation_respects_author_allow_comments_setting`
  - `test_comment_permission_helper_uses_author_settings_and_auth_state`
  - `test_author_can_comment_when_comments_are_disabled_for_others`
  - `test_comment_creation_records_request_correlatable_audit_without_raw_body`
- `agentfeed-backend/tests/test_worklog_like_contracts.py`
  - `test_private_worklog_like_is_not_mutable_by_other_users`
  - `test_like_and_unlike_record_request_correlatable_audit_only_on_state_change`

## Size

```text
3327 tests/test_contracts.py
 233 tests/test_worklog_comment_contracts.py
  95 tests/test_worklog_like_contracts.py
3655 total
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_comment_contracts.py tests/test_worklog_like_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_worklog_comment_contracts.py tests/test_worklog_like_contracts.py
# 9 passed in 0.81s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved comment/like tests>'
# 124 deselected / 0 selected, exit_code=5
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 3.94s
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

- [ ] Continue decomposing `tests/test_contracts.py` by project CRUD, dashboard, and search/discovery ownership.
- [ ] Keep future worklog comment visibility/settings/audit tests in `test_worklog_comment_contracts.py`.
- [ ] Keep future worklog like/unlike idempotency and audit tests in `test_worklog_like_contracts.py`.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
