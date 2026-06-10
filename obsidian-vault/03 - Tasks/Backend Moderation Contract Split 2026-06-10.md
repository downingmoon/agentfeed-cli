---
title: Backend Moderation Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - moderation
status: done
---

# Backend Moderation Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 moderation lifecycle / moderator access 계약 테스트 6개를 `tests/test_moderation_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Enterprise 완성도 목표에서 계약 테스트는 기능 영역별로 독립 실행·리뷰 가능해야 한다.
- moderation 계약은 allowlist, report status transition, audit event, not-found behavior를 함께 묶는 명확한 도메인 경계가 있다.
- 새 파일은 167 LOC로 유지되어 이후 moderation 계약 확장 시 리뷰 단위가 작다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `agentfeed-backend/tests/test_moderation_contracts.py`:

- `test_report_model_restricts_moderation_lifecycle_values`
- `test_moderator_user_ids_are_validated_and_parsed`
- `test_moderation_requires_explicit_moderator_allowlist`
- `test_moderator_can_list_reports_by_status`
- `test_moderator_can_update_report_status_with_audit_event`
- `test_moderation_report_status_update_404s_for_unknown_report`

## Size

```text
6281 tests/test_contracts.py
 167 tests/test_moderation_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'report_model_restricts_moderation_lifecycle_values or moderator_user_ids_are_validated_and_parsed or moderation_requires_explicit_moderator_allowlist or moderator_can_list_reports_by_status or moderator_can_update_report_status_with_audit_event or moderation_report_status_update_404s_for_unknown_report'
# baseline before move: 6 passed, 222 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_moderation_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_moderation_contracts.py
# 6 passed
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

- [ ] Split remaining social report idempotency tests from `tests/test_contracts.py` into a social/report contract file.
- [ ] Continue worklog review/privacy/public-detail contract decomposition.
- [ ] Track `tests/test_contracts.py` until broad catch-all contract content is removed or grouped by domain.
