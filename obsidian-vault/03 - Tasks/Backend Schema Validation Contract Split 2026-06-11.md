---
title: Backend Schema Validation Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - schema-validation
  - worklog
  - maintainability
  - refactor
status: done
related:
  - "[[Backend User Streak Contract Split 2026-06-11]]"
  - "[[Backend GitHub OAuth HTTP Boundary Contract Split 2026-06-11]]"
  - "[[Backend Worklog Card Frontend Contract Split 2026-06-11]]"
---

# Backend Schema Validation Contract Split 2026-06-11

## 목적

Enterprise 완성도 점검 중 backend `tests/test_contracts.py`가 여러 책임을 가진 catch-all 파일로 남아 있었고, 이전 작업 후에도 288 pure LOC로 250 LOC 기준을 초과했다.
이번 작업은 runtime 변경 없이 schema validation 계약을 전용 테스트 파일로 이동해 리뷰 가능성과 회귀 보호의 명확성을 높였다.

## 변경 사항

- `tests/test_schema_validation_contracts.py` 추가.
- `tests/test_contracts.py`에서 아래 계약을 이동.
  - worklog action schema enum validation
  - worklog/social/project/user text field commercial size caps
- `tests/test_contracts.py`의 불필요한 schema import 제거.
- runtime/API/schema/database 변경 없음.
- 서버 배포 없음.

## 검증 Evidence

Backend 경로: `/Users/downing/PersonalProjects/agentfeed-backend`

```bash
uv run pytest tests/test_schema_validation_contracts.py -q
# 2 passed in 0.15s

uv run pytest tests/test_contracts.py::test_visibility_and_status_supported_values_are_database_constrained -q
# 1 passed in 0.49s

uv run ruff check tests/test_contracts.py tests/test_schema_validation_contracts.py
# All checks passed!

uv run pytest -q
# 439 passed, 1 warning in 2.16s
```

정적 점검:

```bash
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_contracts.py | wc -l
# 197

awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_schema_validation_contracts.py | wc -l
# 95

rg -n "type: ignore|pyright: ignore|except Exception|except .*: pass|cast\(|Any" \
  tests/test_contracts.py tests/test_schema_validation_contracts.py
# no matches
```

LSP diagnostics는 `basedpyright-langserver`가 설치되어 있지 않아 실행하지 못했다. 대신 `ruff`와 전체 `pytest`로 검증했다.

## 품질 판정

- `tests/test_contracts.py`: 197 pure LOC로 250 LOC 초과 defect 해소.
- `tests/test_schema_validation_contracts.py`: 95 pure LOC, schema validation 계약만 소유.
- 신규 기능 없음, 동작 변경 없음.

## 남은 후행 과제

- `tests/test_contracts.py`는 LOC 기준으로는 healthy지만 아직 여러 계약이 남아 있다.
- 다음 분리 후보:
  - visibility/status database constraint contract
  - create worklog project/default visibility contract
  - my worklogs UUID/filter signature contract
  - Alembic visibility/status migration contract
- GitHub CI workflow 테스트는 현재 goal의 `서버/인프라/CICD 보류` 조건 때문에 계속 out-of-scope로 둔다.
