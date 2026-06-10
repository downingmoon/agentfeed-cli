---
title: Backend Notification Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - notifications
status: done
---

# Backend Notification Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 notification 관련 계약 테스트 11개를 route/dedupe 기준의 작은 파일 2개로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- `tests/test_contracts.py`는 5,887 LOC에서 시작해 여전히 catch-all 성격이 강했다.
- Notification 계약은 schema/route hydration/read mutation과 publish/dedupe/idempotent insert 계약이 섞여 있어 실패 시 원인 범위가 넓었다.
- 각 새 파일을 250 LOC 이하로 유지해 이후 회귀 범위와 리뷰 부담을 줄였다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` into:

- `tests/test_notification_route_contracts.py`
  - notification response enum/target schema fail-closed 계약
  - soft-deleted actor suppression
  - batched actor hydration
  - user-scoped/idempotent read mutation
- `tests/test_notification_dedupe_contracts.py`
  - public publish follower notification
  - repeated publish dedupe
  - notification dedupe model/index/migration
  - `create_notification` dedupe/settings-gate/ORM-add contracts

## Size

```text
5517 tests/test_contracts.py
 196 tests/test_notification_route_contracts.py
 202 tests/test_notification_dedupe_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'notification_response_contract_rejects_unknown_types or notifications_suppress_soft_deleted_actors or notifications_batch_actor_hydration_for_page or notification_read_mutations_are_user_scoped_and_idempotent or publish_public_worklog_notifies_followers or repeated_public_publish_does_not_duplicate_follower_notifications or notification_model_has_dedupe_key_unique_index or create_notification_uses_idempotent_insert_for_dedupe_key or create_notification_settings_gate_prevents_dedupe_insert or create_notification_without_dedupe_keeps_orm_add_contract or notification_dedupe_migration_declares_reversible_nullable_unique_index'
# baseline before move: 11 passed, 198 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_notification_route_contracts.py tests/test_notification_dedupe_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_notification_route_contracts.py tests/test_notification_dedupe_contracts.py
# 11 passed in 0.44s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved notification tests>'
# 198 deselected / 0 selected, expected pytest exit 5 after move
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

- [ ] Continue splitting project/user public stats contracts from the remaining catch-all backend contract file.
- [ ] Keep future notification route behavior tests in `test_notification_route_contracts.py`.
- [ ] Keep future notification idempotency/dedupe/publish-fanout tests in `test_notification_dedupe_contracts.py`.
- [ ] Do not deploy from this enterprise-readiness pass unless explicitly overridden by the user.
