---
title: Backend User Streak Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - user-profile
  - streak
  - maintainability
  - refactor
status: done
related:
  - "[[Backend GitHub OAuth HTTP Boundary Contract Split 2026-06-11]]"
  - "[[Backend Worklog Card Frontend Contract Split 2026-06-11]]"
  - "[[Backend User Stats Activity Contract Split 2026-06-10]]"
---

# Backend User Streak Contract Split 2026-06-11

## 목적

Enterprise 완성도 점검 중 backend의 대형 catch-all contract 테스트 파일이 계속 커져 유지보수성과 리뷰 가능성이 떨어지는 문제가 있었다.
이번 작업은 공개 프로필의 streak 계산 계약을 런타임 변경 없이 별도 테스트 파일로 분리해, 사용자 프로필 품질에 직접 연결되는 회귀 테스트를 더 명확한 소유 영역으로 이동한 것이다.

## 변경 사항

- `tests/test_user_streak_contracts.py` 추가.
- `tests/test_contracts.py`에서 아래 두 테스트를 이동.
  - 현재 streak는 오늘 글이 없어도 어제부터 이어지는 공개 worklog 연속일을 인정한다.
  - longest streak는 단순 활동일 수가 아니라 실제 연속일 구간만 집계한다.
- runtime/API/schema/database 변경 없음.
- 서버 배포 없음.

## 검증 Evidence

Backend 경로: `/Users/downing/PersonalProjects/agentfeed-backend`

```bash
uv run pytest tests/test_user_streak_contracts.py -q
# 2 passed in 0.28s

uv run pytest tests/test_contracts.py::test_worklog_action_schemas_reject_invalid_enums_with_pydantic_validation -q
# 1 passed in 0.14s

uv run ruff check tests/test_contracts.py tests/test_user_streak_contracts.py
# All checks passed!

uv run pytest -q
# 439 passed, 1 warning in 1.75s
```

정적 점검:

```bash
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_contracts.py | wc -l
# 288

awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(#)/' tests/test_user_streak_contracts.py | wc -l
# 23

rg -n "type: ignore|pyright: ignore|except Exception|except .*: pass|cast\(|Any" \
  tests/test_contracts.py tests/test_user_streak_contracts.py
# no matches
```

LSP diagnostics는 `basedpyright-langserver`가 설치되어 있지 않아 실행하지 못했다. 대신 `ruff`와 전체 `pytest`로 검증했다.

## 남은 후행 과제

- `tests/test_contracts.py`는 288 pure LOC로 아직 catch-all 성격이 남아 있다.
- 다음 분리 후보:
  - worklog action schema enum validation
  - user-generated text size caps
  - create worklog project/default visibility contracts
- GitHub CI workflow 테스트는 현재 goal의 `서버/인프라/CICD 보류` 조건 때문에 이번 단계에서 분리하지 않았다.
