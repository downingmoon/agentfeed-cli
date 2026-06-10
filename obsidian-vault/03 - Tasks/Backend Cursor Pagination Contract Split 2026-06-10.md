---
title: Backend Cursor Pagination Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contracts
  - pagination
  - verification
status: done
---

# Backend Cursor Pagination Contract Split 2026-06-10

## 목적

Backend의 oversized `tests/test_contracts.py`에 남아 있던 cursor/pagination boundary guard를 전용 파일로 분리했다. 신규 기능 추가 없이 검색/리더보드 cursor offset 상한과 oversized cursor token 방어 계약을 더 작은 검증 단위로 만들기 위한 작업이다.

> [!info] Goal 제약
> 이번 패스는 서버/인프라/CICD를 변경하지 않았다. 개인서버 배포도 수행하지 않았다.

## 변경 파일

- Backend
  - `tests/test_cursor_pagination_contracts.py` 신규 생성
  - `tests/test_contracts.py`에서 이동된 cursor/pagination 테스트 제거

## 이동한 계약 테스트

- `test_search_cursor_rejects_huge_offsets`
- `test_cursor_decode_ignores_oversized_tokens_without_parsing`
- `test_leaderboard_cursor_rejects_huge_offsets`

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'cursor_rejects or cursor_decode_ignores or leaderboard_cursor_rejects_huge_offsets or pagination_cursor'
# 4 passed, 230 deselected
```

> [!note]
> 기준선에는 검색 query wildcard guard도 함께 선택되었지만, 이번 파일 분리는 cursor/pagination boundary 3개만 이동했다.

```bash
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_cursor_pagination_contracts.py
# All checks passed!
```

```bash
uv run --locked --group dev pytest tests/test_cursor_pagination_contracts.py
# 3 passed
```

```bash
uv run --locked --group dev pytest tests/test_contracts.py -k 'search_cursor_rejects_huge_offsets or cursor_decode_ignores_oversized_tokens_without_parsing or leaderboard_cursor_rejects_huge_offsets'
# 231 deselected / 0 selected after split
```

```bash
uv run --locked --group dev pytest
# 428 passed, 1 warning
```

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh
# OpenAPI contract gate passed
# CLI: 28 files / 591 tests passed, typecheck passed, release preflight passed, audit 0 vulnerabilities
# Frontend: typecheck/lint, contract tests, mock API compatibility, production build, audit passed
# Backend: ruff passed, 428 tests passed, alembic offline migration chain generated
```

## 결과

- `tests/test_contracts.py`는 6547 lines에서 6517 lines로 줄었다.
- `tests/test_cursor_pagination_contracts.py`는 27 lines로 250 LOC ceiling 안에 유지했다.
- 검색/리더보드 cursor safety 계약은 변경하지 않았다.

## 후행 과제

- `test_search_query_rejects_wildcard_only_terms_and_escapes_like_patterns`는 search query normalization 전용 파일로 분리한다.
- `test_rate_limit_rules_cover_critical_mutation_paths`, `test_rate_limit_rules_cover_public_discovery_paths`는 rate-limit route coverage 전용 파일로 분리한다.
- `tests/test_contracts.py`에 남은 moderation/social/worklog 계약을 계속 cohesive 파일로 분해한다.
