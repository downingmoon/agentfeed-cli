---
title: Backend User Profile Input Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - user
  - profile
  - validation
status: done
---

# Backend User Profile Input Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 user/profile input boundary 계약 테스트 5개를 `tests/test_user_profile_input_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- User/profile input boundary는 Frontend settings/profile UI, Backend schema validation, CLI ingest repository URL validation이 동시에 공유하는 보안/계약 경계다.
- Username availability reason, username normalization, profile nullable field clearing, public URL scheme/credential/private-host rejection이 catch-all에 남아 있으면 UI/API 불일치와 SSRF성 URL 회귀를 빠르게 좁히기 어렵다.
- Enterprise-readiness 목표상 신규 기능보다 기존 입력 경계를 작은 테스트 파일로 고정해 회귀 탐지력을 높이는 것이 우선이다.

## Changed

- `agentfeed-backend/tests/test_user_profile_input_contracts.py`
  - `test_username_check_reason_contract_is_closed`
  - `test_user_profile_and_username_inputs_are_bounded_before_database_write`
  - `test_public_url_schemas_reject_unsafe_schemes`
  - `test_public_url_schemas_do_not_perform_blocking_dns_validation`
  - `test_update_profile_can_clear_nullable_fields_and_trim_display_name`
- `agentfeed-backend/tests/test_contracts.py`
  - user/profile input boundary 테스트 5개 제거

## Size

```text
2349 tests/test_contracts.py
 233 tests/test_user_profile_input_contracts.py
2582 total
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved user/profile input tests>'
# baseline before split: 5 passed, 97 deselected in 0.45s
```

```text
uv run --locked --group dev pytest tests/test_user_profile_input_contracts.py
# 5 passed in 0.38s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved user/profile input tests>'
# 97 deselected / 0 selected, exit_code=5 after split
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_user_profile_input_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.65s
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

- [ ] Continue decomposing `tests/test_contracts.py` by auth/current-user session boundary and shared schema/model boundaries.
- [ ] Keep future username/profile input validation and profile update audit tests in `test_user_profile_input_contracts.py`.
- [ ] Keep public project URL validation tests here only when they guard shared user-facing input contracts; keep project CRUD behavior in project-specific files.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
