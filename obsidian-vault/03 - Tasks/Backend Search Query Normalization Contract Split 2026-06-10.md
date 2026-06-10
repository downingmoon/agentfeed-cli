---
title: Backend Search Query Normalization Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contracts
  - search
  - verification
status: done
---

# Backend Search Query Normalization Contract Split 2026-06-10

## 목적

Backend의 oversized `tests/test_contracts.py`에 남아 있던 search query normalization guard를 전용 파일로 분리했다. 신규 기능 추가 없이 wildcard-only query 차단과 SQL LIKE pattern escape 계약을 더 작은 검증 단위로 만든 작업이다.

> [!info] Goal 제약
> 이번 패스는 서버/인프라/CICD를 변경하지 않았다. 개인서버 배포도 수행하지 않았다.

## 변경 파일

- Backend
  - `tests/test_search_query_normalization_contracts.py` 신규 생성
  - `tests/test_contracts.py`에서 이동된 search query normalization 테스트 제거

## 이동한 계약 테스트

- `test_search_query_rejects_wildcard_only_terms_and_escapes_like_patterns`

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'search_query_rejects_wildcard_only_terms_and_escapes_like_patterns'
# 1 passed, 230 deselected
```

```bash
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_search_query_normalization_contracts.py
# All checks passed!
```

```bash
uv run --locked --group dev pytest tests/test_search_query_normalization_contracts.py
# 1 passed
```

```bash
uv run --locked --group dev pytest tests/test_contracts.py -k 'search_query_rejects_wildcard_only_terms_and_escapes_like_patterns'
# 230 deselected / 0 selected after split
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

- `tests/test_contracts.py`는 6517 lines에서 6504 lines로 줄었다.
- `tests/test_search_query_normalization_contracts.py`는 16 lines로 250 LOC ceiling 안에 유지했다.
- Search query normalization/LIKE escaping 계약 의미는 변경하지 않았다.

## 후행 과제

- `test_rate_limit_rules_cover_critical_mutation_paths`, `test_rate_limit_rules_cover_public_discovery_paths`를 rate-limit route coverage 전용 파일로 분리한다.
- `tests/test_contracts.py`에 남은 moderation/social/worklog 계약을 계속 cohesive 파일로 분해한다.
- Contract gate는 통과했지만 runtime UX audit는 별도 패스로 계속 수행한다.
