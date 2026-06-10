---
title: Backend Feed Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - feed
status: done
---

# Backend Feed Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 public feed/feed item 계약 테스트 6개를 `tests/test_feed_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Feed는 Frontend `/feed` 화면과 Backend public feed query/card hydration contract가 직접 맞물리는 핵심 표면이다.
- Catch-all 계약 파일이 계속 비대해지고 있어, feed cursor/query/privacy/card hydration 계약을 독립 소유 파일로 분리했다.
- Search 전용 card builder 테스트는 아직 search 계약으로 남겨두고, 이번 파일은 feed router/service 계약만 포함했다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `tests/test_feed_contracts.py`:

- `test_feed_cards_propagate_comment_capability_for_authenticated_viewers`
- `test_feed_aggregate_sort_cursor_uses_keyset_contract`
- `test_feed_aggregate_sort_cursor_is_stable_after_prior_page_mutations`
- `test_public_feed_surfaces_filter_soft_deleted_authors_at_query_level`
- `test_feed_time_range_filter_maps_known_public_feed_options`
- `test_feed_items_omit_soft_deleted_project_metadata`

## Size

```text
4484 tests/test_contracts.py
 267 tests/test_feed_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_feed_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_feed_contracts.py
# 6 passed in 0.32s
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.63s
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

- [ ] Continue decomposing `tests/test_contracts.py` by worklog publish/privacy/detail contract ownership.
- [ ] Split search/explore public discovery contracts into a dedicated file when the next pass targets discovery surfaces.
- [ ] Keep future public feed cursor, query, deleted-author/project filtering, and feed item hydration tests in `test_feed_contracts.py`.
- [ ] Keep server/infra/CICD and deployment work deferred unless the user explicitly overrides the active goal rule.
