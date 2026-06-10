---
title: Backend Cursor Public List Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - cursor
  - public-list
  - pagination
status: done
---

# Backend Cursor Public List Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 malformed cursor 및 public worklog list boundary 계약 테스트 4개를 `tests/test_cursor_public_list_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Cursor/list boundary는 Frontend feed/project/profile pagination, Backend cursor decoder, public worklog listing이 공유하는 stability contract다.
- Malformed cursor가 500으로 번지지 않고 empty page로 닫히는지, project/user public worklog list가 published status를 강제하는지는 UI 안정성과 privacy exposure 방지에 직접 연결된다.
- Enterprise-readiness 목표상 신규 기능보다 기존 pagination/public-list 계약을 dedicated file로 고정해 회귀 탐지력을 높이는 것이 우선이다.

## Changed

- `agentfeed-backend/tests/test_cursor_public_list_contracts.py`
  - `test_decode_datetime_id_cursor_rejects_malformed_payloads`
  - `test_keyset_list_endpoints_ignore_malformed_cursors_instead_of_500s`
  - `test_project_worklog_public_list_requires_published_status`
  - `test_user_worklog_public_list_requires_published_status`
- `agentfeed-backend/tests/test_contracts.py`
  - cursor/public-list boundary 테스트 4개 제거

## Size

```text
2086 tests/test_contracts.py
 215 tests/test_cursor_public_list_contracts.py
2301 total
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved cursor/public-list tests>'
# baseline before split: 4 passed, 88 deselected in 0.66s
```

```text
uv run --locked --group dev pytest tests/test_cursor_public_list_contracts.py
# 4 passed in 0.49s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved cursor/public-list tests>'
# 88 deselected / 0 selected, exit_code=5 after split
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_cursor_public_list_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 2.21s
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

- [ ] Continue decomposing `tests/test_contracts.py` by shared schema/model boundaries and remaining settings/system contracts.
- [ ] Keep future cursor decoder, malformed cursor graceful fallback, and public list published-status guard tests in `test_cursor_public_list_contracts.py`.
- [ ] Keep feature-specific pagination tests in their feature files when they require behavior beyond the shared cursor/list boundary.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
