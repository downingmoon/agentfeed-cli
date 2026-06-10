---
title: Backend Integration And My Worklogs Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - integration-guides
  - worklog
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Create Worklog Contract Split 2026-06-11]]"
  - "[[Backend Schema Validation Contract Split 2026-06-11]]"
  - "[[Backend User Streak Contract Split 2026-06-11]]"
---

# Backend Integration And My Worklogs Contract Split 2026-06-11

## 목적

Enterprise 완성도 점검 중 backend `tests/test_contracts.py`에 남아 있던 비-CICD 계약 중 integration guide 타입/status 계약과 my worklogs filter signature 계약을 분리했다.
이 작업은 runtime 변경 없이 각 계약의 소유 파일을 명확히 하여 API/Frontend/CLI 계약 점검 시 회귀 원인을 빠르게 찾기 위한 유지보수 개선이다.

## 변경 사항

- `tests/test_integration_guide_contracts.py` 추가.
  - integration guide supported type 목록과 status literal validation 계약을 소유한다.
- `tests/test_my_worklogs_filter_contracts.py` 추가.
  - `/me/worklogs` project/status/visibility filter signature 계약을 소유한다.
- `tests/test_contracts.py`에서 위 두 계약과 관련 import 제거.
- runtime/API/schema/database 변경 없음.
- 서버 배포 없음.

## 검증 Evidence

Backend 경로: `/Users/downing/PersonalProjects/agentfeed-backend`

```bash
uv run pytest tests/test_integration_guide_contracts.py tests/test_my_worklogs_filter_contracts.py -q
# 2 passed in 0.41s

uv run pytest tests/test_contracts.py::test_visibility_and_status_supported_values_are_database_constrained -q
# 1 passed in 0.20s

uv run ruff check tests/test_contracts.py tests/test_integration_guide_contracts.py tests/test_my_worklogs_filter_contracts.py
# All checks passed!

uv run pytest -q
# 439 passed, 1 warning in 1.66s
```

정적 점검:

```bash
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_contracts.py | wc -l
# 67

awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_integration_guide_contracts.py | wc -l
# 25

awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_my_worklogs_filter_contracts.py | wc -l
# 16

rg -n "type: ignore|pyright: ignore|except Exception|except .*: pass|cast\(|Any" \
  tests/test_contracts.py tests/test_integration_guide_contracts.py tests/test_my_worklogs_filter_contracts.py
# no matches
```

LSP diagnostics는 `basedpyright-langserver`가 설치되어 있지 않아 실행하지 못했다. 대신 `ruff`와 전체 `pytest`로 검증했다.

## 품질 판정

- `tests/test_contracts.py`: 67 pure LOC까지 축소.
- `tests/test_integration_guide_contracts.py`: 25 pure LOC, integration guide 계약만 소유.
- `tests/test_my_worklogs_filter_contracts.py`: 16 pure LOC, my worklogs filter signature 계약만 소유.
- 신규 기능 없음, 동작 변경 없음.

## 남은 후행 과제

- `tests/test_contracts.py`에는 현재 다음 항목만 남아 있다.
  - GitHub CI workflow contract: goal의 `서버/인프라/CICD 보류` 조건 때문에 out-of-scope.
  - visibility/status database constraint contract.
  - Alembic visibility/status migration contract: DB migration 관련이라 현재는 신중히 별도 판단 필요.
- 다음 안전 후보는 visibility/status database constraint contract를 별도 파일로 분리하되, Alembic migration 테스트는 인프라/DB 경계로 보류하거나 별도 문서화하는 것이다.
