---
title: Backend Rate Limit Route Coverage Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - rate-limit
status: done
---

# Backend Rate Limit Route Coverage Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py` 말미에 남아 있던 rate-limit route coverage 계약 테스트 2개를 독립 파일로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Enterprise 완성도 목표에서 contract test가 한 파일에 과도하게 집중되어 있으면 리뷰와 회귀 원인 추적이 어려워진다.
- rate-limit route coverage는 구현 계약상 독립 의미가 명확하므로 dedicated test file이 더 안전하다.
- `test_rate_limit_path_contracts.py`에 합치면 300 LOC를 넘어서, 새 파일로 분리해 파일 크기 기준을 지켰다.

## Changed

- Removed from `agentfeed-backend/tests/test_contracts.py`
  - `test_rate_limit_rules_cover_critical_mutation_paths`
  - `test_rate_limit_rules_cover_public_discovery_paths`
- Added `agentfeed-backend/tests/test_rate_limit_route_coverage_contracts.py`
  - same route coverage assertions, behavior unchanged

## Size

```text
6418 tests/test_contracts.py
 220 tests/test_rate_limit_path_contracts.py
  82 tests/test_rate_limit_route_coverage_contracts.py
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'rate_limit_rules_cover_critical_mutation_paths or rate_limit_rules_cover_public_discovery_paths'
# baseline before move: 2 passed, 228 deselected
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_rate_limit_path_contracts.py tests/test_rate_limit_route_coverage_contracts.py --fix
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_rate_limit_route_coverage_contracts.py
# 2 passed
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Classified backend-only operations: 5
```

## Follow-up

- [ ] Continue decomposing remaining moderation tests from `tests/test_contracts.py`.
- [ ] Split social/profile/worklog review groups into dedicated contract files.
- [ ] Track remaining oversized backend contract files and keep new files below ~250 LOC where practical.
