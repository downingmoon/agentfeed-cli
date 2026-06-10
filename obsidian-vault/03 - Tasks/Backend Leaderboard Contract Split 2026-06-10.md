---
title: Backend Leaderboard Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - leaderboard
status: done
---

# Backend Leaderboard Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 leaderboard 계약 테스트 8개를 `tests/test_leaderboard_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Leaderboard는 Frontend의 `/leaderboard` 화면과 Backend aggregation/privacy/query contract가 직접 맞물리는 영역이다.
- `tests/test_contracts.py`가 계속 비대해지고 있어, leaderboard 관련 회귀 테스트를 독립 파일로 분리해 계약 소유권을 명확히 했다.
- `most_tests_added` privacy filter와 public leaderboard index contract까지 같은 파일에 둬 leaderboard regression 추적성을 높였다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `tests/test_leaderboard_contracts.py`:

- `test_leaderboard_response_models_reject_extra_fields`
- `test_leaderboard_longest_streak_ranks_true_streaks_before_distinct_day_count`
- `test_leaderboard_uses_cursor_offset_and_global_rank_metadata`
- `test_leaderboard_batches_viewer_following_state`
- `test_leaderboard_longest_streak_uses_distinct_author_days_and_batched_follows`
- `test_leaderboard_malformed_cursor_falls_back_to_first_page`
- `test_tests_leaderboard_filters_private_test_counts`
- `test_worklog_model_has_public_leaderboard_index`

## Size

```text
4735 tests/test_contracts.py
 277 tests/test_leaderboard_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_leaderboard_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_leaderboard_contracts.py
# 8 passed in 0.51s
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 3.42s
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

- [ ] Continue decomposing `tests/test_contracts.py` by worklog publish/privacy and feed contract ownership.
- [ ] Keep future leaderboard aggregation, cursor, viewer-state, and privacy metric tests in `test_leaderboard_contracts.py`.
- [ ] Keep server/infra/CICD and deployment work deferred unless the user explicitly overrides the active goal rule.
