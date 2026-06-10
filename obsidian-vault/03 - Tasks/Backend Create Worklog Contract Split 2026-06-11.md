---
title: Backend Create Worklog Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - project
  - visibility
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Schema Validation Contract Split 2026-06-11]]"
  - "[[Backend User Streak Contract Split 2026-06-11]]"
  - "[[Backend Worklog Card Frontend Contract Split 2026-06-11]]"
---

# Backend Create Worklog Contract Split 2026-06-11

## 목적

Enterprise 완성도 점검 중 backend `tests/test_contracts.py`에는 여전히 create worklog 경로의 project ownership/default visibility 계약이 섞여 있었다.
이번 작업은 runtime 변경 없이 create worklog 계약을 전용 테스트 파일로 분리해, worklog 생성 경로의 보안·권한·기본값 회귀 보호를 더 명확히 했다.

## 변경 사항

- `tests/test_create_worklog_contracts.py` 추가.
- `tests/test_contracts.py`에서 아래 계약을 이동.
  - create worklog request의 `project_id` UUID boundary validation
  - 본인 소유 active project에만 worklog attach 허용
  - worklog visibility 생략 시 user default visibility 사용
  - 타인/누락 project id에 대한 write-less reject
- `tests/test_contracts.py`에서 더 이상 필요 없는 fake DB/user/import 제거.
- runtime/API/schema/database 변경 없음.
- 서버 배포 없음.

## 검증 Evidence

Backend 경로: `/Users/downing/PersonalProjects/agentfeed-backend`

```bash
uv run pytest tests/test_create_worklog_contracts.py -q
# 4 passed in 0.46s

uv run pytest tests/test_contracts.py::test_my_worklogs_project_id_filter_uses_fastapi_uuid_validation -q
# 1 passed in 0.35s

uv run ruff check tests/test_contracts.py tests/test_create_worklog_contracts.py
# All checks passed!

uv run pytest -q
# 439 passed, 1 warning in 2.01s
```

정적 점검:

```bash
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_contracts.py | wc -l
# 108

awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_create_worklog_contracts.py | wc -l
# 80

rg -n "type: ignore|pyright: ignore|except Exception|except .*: pass|cast\(|Any" \
  tests/test_contracts.py tests/test_create_worklog_contracts.py
# no matches
```

LSP diagnostics는 `basedpyright-langserver`가 설치되어 있지 않아 실행하지 못했다. 대신 `ruff`와 전체 `pytest`로 검증했다.

## 품질 판정

- `tests/test_contracts.py`: 108 pure LOC, catch-all 잔여량이 크게 줄었다.
- `tests/test_create_worklog_contracts.py`: 80 pure LOC, create worklog ownership/default visibility 계약만 소유한다.
- 신규 기능 없음, 동작 변경 없음.

## 남은 후행 과제

- `tests/test_contracts.py`에 남은 비-CICD 후보:
  - integration guide status/type contract
  - visibility/status database constraint contract
  - my worklogs UUID/filter signature contract
  - Alembic visibility/status migration contract
- GitHub CI workflow 테스트는 현재 goal의 `서버/인프라/CICD 보류` 조건 때문에 계속 out-of-scope로 둔다.
