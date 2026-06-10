---
title: Backend Visibility Status Constraint Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - database-contract
  - visibility
  - status
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Integration And My Worklogs Contract Split 2026-06-11]]"
  - "[[Backend Create Worklog Contract Split 2026-06-11]]"
  - "[[Backend Schema Validation Contract Split 2026-06-11]]"
---

# Backend Visibility Status Constraint Contract Split 2026-06-11

## 목적

Enterprise 완성도 점검 중 backend `tests/test_contracts.py`에 남아 있던 비-CICD 계약 중 visibility/status database constraint 계약을 분리했다.
이 계약은 API schema와 DB column constraint 사이의 값 범위 일치를 지키는 회귀 보호이므로, 별도 파일에서 명확히 관리하는 편이 contract mismatch 점검에 유리하다.

## 변경 사항

- `tests/test_visibility_status_constraint_contracts.py` 추가.
- `tests/test_contracts.py`에서 visibility/status DB constraint 계약 이동.
- runtime/API/schema/database 변경 없음.
- 서버 배포 없음.

## 검증 Evidence

Backend 경로: `/Users/downing/PersonalProjects/agentfeed-backend`

```bash
uv run pytest tests/test_visibility_status_constraint_contracts.py -q
# 1 passed in 0.28s

uv run pytest tests/test_contracts.py::test_visibility_status_migration_expands_alembic_version_column_for_long_revision_id -q
# 1 passed in 0.05s

uv run ruff check tests/test_contracts.py tests/test_visibility_status_constraint_contracts.py
# All checks passed!

uv run pytest -q
# 439 passed, 1 warning in 1.68s
```

정적 점검:

```bash
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_contracts.py | wc -l
# 55

awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_visibility_status_constraint_contracts.py | wc -l
# 12

rg -n "type: ignore|pyright: ignore|except Exception|except .*: pass|cast\(|Any" \
  tests/test_contracts.py tests/test_visibility_status_constraint_contracts.py
# no matches
```

LSP diagnostics는 `basedpyright-langserver`가 설치되어 있지 않아 실행하지 못했다. 대신 `ruff`와 전체 `pytest`로 검증했다.

## 품질 판정

- `tests/test_contracts.py`: 55 pure LOC까지 축소.
- `tests/test_visibility_status_constraint_contracts.py`: 12 pure LOC, DB visibility/status constraint 계약만 소유.
- 신규 기능 없음, 동작 변경 없음.

## 남은 후행 과제

- `tests/test_contracts.py`에는 현재 다음만 남아 있다.
  - GitHub CI workflow contract: goal의 `서버/인프라/CICD 보류` 조건 때문에 out-of-scope.
  - Alembic visibility/status migration contract: migration/DB 운영 경계라 현재 goal에서는 별도 판단 필요.
- 다음 작업은 backend catch-all을 더 손대기보다 CLI/Frontend/Backend contract audit 관점으로 전환해, 실제 타입/응답 스키마 mismatch 후보를 다시 탐색하는 것이 좋다.
