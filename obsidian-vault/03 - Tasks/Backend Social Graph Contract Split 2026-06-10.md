---
title: Backend Social Graph Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - social
  - follow
  - bookmark
status: done
---

# Backend Social Graph Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 bookmark/follow social graph 계약 테스트 7개를 `tests/test_social_graph_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Follow/bookmark mutation, audit event, duplicate race, self-follow constraint는 social graph 도메인의 핵심 계약이다.
- 거대 catch-all 계약 파일에서 social graph failure를 독립시켜 원인 추적과 리뷰 단위를 줄인다.
- 새 파일은 242 LOC로 유지되어 practical 250 LOC 기준 안에 들어간다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `agentfeed-backend/tests/test_social_graph_contracts.py`:

- `test_private_worklog_bookmark_is_not_mutable_by_other_users`
- `test_bookmark_and_unbookmark_record_request_correlatable_audit_only_on_state_change`
- `test_self_follow_is_rejected_before_mutation`
- `test_follow_and_unfollow_record_request_correlatable_audit_only_on_state_change`
- `test_like_and_bookmark_unique_races_are_idempotent`
- `test_follow_unique_race_is_idempotent_without_self_follow_skew`
- `test_follow_model_has_no_self_follow_constraint`

## Size

```text
5971 tests/test_contracts.py
 242 tests/test_social_graph_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'private_worklog_bookmark_is_not_mutable_by_other_users or bookmark_and_unbookmark_record_request_correlatable_audit_only_on_state_change or self_follow_is_rejected_before_mutation or follow_and_unfollow_record_request_correlatable_audit_only_on_state_change or like_and_bookmark_unique_races_are_idempotent or follow_unique_race_is_idempotent_without_self_follow_skew or follow_model_has_no_self_follow_constraint'
# baseline before move: 7 passed, 211 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_social_graph_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_social_graph_contracts.py
# 7 passed
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

- [ ] Split user profile viewer-state contracts from `tests/test_contracts.py`.
- [ ] Continue worklog privacy/review/public-detail contract decomposition.
- [ ] Consider extracting like/unlike action contracts if social graph file grows beyond 250 LOC.
