---
title: Backend User Profile Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - user-profile
status: done
---

# Backend User Profile Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 user profile viewer-state runtime 계약 테스트 2개를 `tests/test_user_profile_contracts.py`로 분리했다. 이번 패스는 개인서버 배포 요청 전 미완료 변경을 추적 가능한 상태로 마감하기 위한 정리 작업이다.

## Why

- Public user schema 검증은 이미 별도 파일에 있지만 `get_user_profile` runtime viewer-state 계약은 catch-all contract file에 남아 있었다.
- self-viewer는 follow lookup을 하지 않고 `following: false`여야 하며, non-self viewer는 follow lookup 결과를 반영해야 한다.
- 새 파일은 작고 독립 실행 가능해야 다음 계약 분리 작업의 회귀 범위를 줄일 수 있다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to `agentfeed-backend/tests/test_user_profile_contracts.py`:

- `test_user_profile_hydrates_viewer_following_state`
- `test_user_profile_self_viewer_state_never_reports_following`

## Size

```text
5887 tests/test_contracts.py
  94 tests/test_user_profile_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'user_profile_hydrates_viewer_following_state or user_profile_self_viewer_state_never_reports_following'
# baseline before move: 2 passed, 209 deselected
```

```text
uv run --locked --group dev pytest tests/test_user_profile_contracts.py
# 2 passed in 0.41s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'user_profile_hydrates_viewer_following_state or user_profile_self_viewer_state_never_reports_following'
# 209 deselected / 0 selected, expected pytest exit 5 after move
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_user_profile_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.94s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
```

```text
bash scripts/test-all.sh
# AgentFeed OpenAPI contract gate passed.
# AgentFeed CLI: 591 passed; typecheck; release preflight; audit 0 vulnerabilities
# Frontend: typecheck; mock API compatibility; production build; audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Follow-up

- [ ] Continue worklog privacy/review/public-detail contract decomposition.
- [ ] Consider a profile/project public-read contract split if remaining catch-all profile/project tests stay coupled.
- [ ] Keep new contract files below ~250 LOC where practical.
