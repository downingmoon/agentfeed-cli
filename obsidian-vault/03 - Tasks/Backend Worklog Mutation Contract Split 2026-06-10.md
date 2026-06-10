---
title: Backend Worklog Mutation Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - worklog
  - mutation
status: done
---

# Backend Worklog Mutation Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 worklog update/unpublish mutation 계약 테스트 5개를 `tests/test_worklog_mutation_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Worklog mutation은 Frontend review/edit/unpublish 플로우와 Backend status/visibility/audit contract가 직접 맞물리는 영역이다.
- Catch-all 파일에 남아 있던 mutation 테스트를 전용 파일로 분리해 published worklog edit lock, nullable draft field clearing, unpublish visibility transition 회귀를 추적하기 쉽게 했다.
- 새 파일은 183 LOC로 유지해 이후 publish/update mutation 테스트를 확장하더라도 파일 크기 한계를 넘지 않도록 했다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `tests/test_worklog_mutation_contracts.py`:

- `test_update_rejects_public_field_changes_after_publish`
- `test_update_worklog_can_clear_nullable_draft_public_fields`
- `test_unpublish_request_defaults_private_and_rejects_public_visibility`
- `test_unpublish_defaults_to_private_instead_of_republishing`
- `test_unpublish_allows_unlisted_but_never_public`

## Size

```text
4104 tests/test_contracts.py
 183 tests/test_worklog_mutation_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_mutation_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_worklog_mutation_contracts.py
# 5 passed in 0.33s
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.69s
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

- [ ] Continue decomposing `tests/test_contracts.py` by publish privacy gate and publish state transition ownership.
- [ ] Keep future update/unpublish status, visibility, nullable field clearing, and audit tests in `test_worklog_mutation_contracts.py`.
- [ ] Keep server/infra/CICD and deployment work deferred unless the user explicitly overrides the active goal rule.
