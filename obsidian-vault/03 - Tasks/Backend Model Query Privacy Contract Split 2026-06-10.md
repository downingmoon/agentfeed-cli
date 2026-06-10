---
title: Backend Model Query Privacy Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contracts
  - privacy
  - verification
status: done
---

# Backend Model Query Privacy Contract Split 2026-06-10

## 목적

Backend의 oversized `tests/test_contracts.py`에 남아 있던 model column guard와 bookmarks query privacy guard를 전용 파일로 분리했다. 신규 기능 추가 없이 기존 DB model/query 계약을 더 작은 검증 단위로 분해하여 Enterprise 수준의 회귀 추적성을 높이는 작업이다.

> [!info] Goal 제약
> 이번 패스는 서버/인프라/CICD를 변경하지 않았다. 개인서버 배포도 수행하지 않았다.

## 변경 파일

- Backend
  - `tests/test_worklog_model_contracts.py` 신규 생성
  - `tests/test_bookmark_visibility_query_contracts.py` 신규 생성
  - `tests/test_contracts.py`에서 이동된 테스트 제거

## 이동한 계약 테스트

- `test_worklog_model_has_user_note_column`
  - `Worklog` ORM model에 `user_note` column이 남아 있는지 확인한다.
- `test_bookmarks_query_hides_non_owner_non_public_worklogs`
  - `/me/bookmarks` query가 owner/non-public visibility 조건을 유지하는지 확인한다.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'worklog_model_has_user_note_column or bookmarks_query_hides_non_owner_non_public_worklogs'
# 2 passed, 234 deselected
```

```bash
uv run --locked --group dev pytest tests/test_worklog_model_contracts.py tests/test_bookmark_visibility_query_contracts.py
# 2 passed
```

```bash
uv run --locked --group dev pytest tests/test_contracts.py -k 'worklog_model_has_user_note_column or bookmarks_query_hides_non_owner_non_public_worklogs'
# 234 deselected / 0 selected after split
```

```bash
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_model_contracts.py tests/test_bookmark_visibility_query_contracts.py
# All checks passed!
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

- `tests/test_contracts.py`는 6574 lines에서 6547 lines로 줄었다.
- 새 파일들은 250 LOC ceiling 안에 유지했다.
  - `tests/test_worklog_model_contracts.py`: 6 lines
  - `tests/test_bookmark_visibility_query_contracts.py`: 28 lines
- DB schema/query privacy 계약 의미는 변경하지 않았다.

## 후행 과제

- `tests/test_contracts.py`에 남은 cursor/leaderboard/search/social/worklog 계약을 cohesive 파일 단위로 계속 분리한다.
- 이미 통과한 CLI/Frontend/Backend contract gate 외에도, 별도 runtime UX audit 패스로 실제 브라우저·CLI 플로우의 사용자 경험을 계속 검증한다.
