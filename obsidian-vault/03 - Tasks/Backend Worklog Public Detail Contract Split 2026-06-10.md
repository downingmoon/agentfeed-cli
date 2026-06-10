---
title: Backend Worklog Public Detail Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - worklog
  - privacy
status: done
---

# Backend Worklog Public Detail Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 public worklog detail/privacy 계약 테스트 4개를 `tests/test_worklog_public_detail_contracts.py`로 분리했다. 기존 `tests/test_worklog_public_detail_privacy_contracts.py`는 source/privacy scan sanitization 전용 파일로 작게 유지했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Public worklog detail은 Frontend `/worklogs/[id]` 화면과 Backend privacy filtering/query contract가 직접 맞물리는 핵심 표면이다.
- Catch-all 파일에 남아 있던 detail response/query 테스트를 전용 파일로 분리해 metrics privacy, legacy outcome normalization, soft-deleted author/project filtering 회귀를 찾기 쉽게 했다.
- `omo:programming` file-size 원칙에 맞춰 detail response 파일은 227 LOC, source/privacy sanitization 파일은 94 LOC로 유지했다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `tests/test_worklog_public_detail_contracts.py`:

- `test_worklog_detail_hides_disallowed_public_metrics`
- `test_worklog_detail_normalizes_legacy_string_outcomes`
- `test_worklog_detail_rejects_soft_deleted_author`
- `test_worklog_detail_omits_soft_deleted_project_metadata`

Kept in `tests/test_worklog_public_detail_privacy_contracts.py`:

- `test_public_worklog_detail_sanitizes_source_and_privacy_scan_findings`

## Size

```text
4274 tests/test_contracts.py
 227 tests/test_worklog_public_detail_contracts.py
  94 tests/test_worklog_public_detail_privacy_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_public_detail_privacy_contracts.py tests/test_worklog_public_detail_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_worklog_public_detail_privacy_contracts.py tests/test_worklog_public_detail_contracts.py
# 5 passed in 0.33s
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.61s
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

- [ ] Continue decomposing `tests/test_contracts.py` by worklog publish/update/unpublish contract ownership.
- [ ] Keep future public worklog detail response/query/privacy metric tests in `test_worklog_public_detail_contracts.py`.
- [ ] Keep future source/privacy scan sanitization tests in `test_worklog_public_detail_privacy_contracts.py`.
- [ ] Keep server/infra/CICD and deployment work deferred unless the user explicitly overrides the active goal rule.
