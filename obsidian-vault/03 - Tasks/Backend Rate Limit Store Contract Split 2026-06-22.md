---
title: Backend Rate Limit Store Contract Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 backend rate limit store contract split
  - Backend rate limit store contract split
---

# Backend Rate Limit Store Contract Split 2026-06-22

> [!success]
> Backend `tests/test_rate_limit_store.py`의 과밀 contract coverage를 responsibility별 파일로 분리했다. 런타임 동작 변경 없이 in-memory shared bucket, degraded fallback, database persistence, production settings 계약을 각각 독립 suite로 검증한다.

## Scope

- 대상 repo: `agentfeed-backend`
- Commit:
  - `5208fb5 Split rate limit store contract tests`
- 변경 파일:
  - `tests/test_rate_limit_store.py`
  - `tests/test_rate_limit_store_degraded_contracts.py`
  - `tests/test_database_rate_limit_store_contracts.py`
  - `tests/test_rate_limit_store_settings_contracts.py`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: contract test decomposition / reviewability hardening

## Background

기존 `tests/test_rate_limit_store.py`는 in-memory store, database store, degraded fallback, production settings 계약을 한 파일에서 함께 검증했고 pure LOC가 378이었다. 이는 250 LOC reviewability 기준을 넘어서며 rate-limit 관련 남은 TODO의 “contract split 계속 진행” 범위와도 맞닿아 있었다.

## Changes

- `tests/test_rate_limit_store.py`는 in-memory/shared bucket 및 unmatched path bucket 계약만 남겼다.
- `tests/test_rate_limit_store_degraded_contracts.py`를 추가해 database store 장애 시 fail-closed/degraded fallback/allowlist 계약을 분리했다.
- `tests/test_database_rate_limit_store_contracts.py`를 추가해 advisory lock, identity hash, active hit block, global prune throttle 계약을 분리했다.
- `tests/test_rate_limit_store_settings_contracts.py`를 추가해 production 환경의 database-backed rate-limit store 설정 계약을 분리했다.
- production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: uv run --locked --group dev pytest tests/test_rate_limit_store.py -q: 14 passed
Focused split: uv run --locked --group dev pytest tests/test_rate_limit_store.py tests/test_rate_limit_store_degraded_contracts.py tests/test_database_rate_limit_store_contracts.py tests/test_rate_limit_store_settings_contracts.py -q: 14 passed
Rate-limit suite: uv run --locked --group dev pytest tests/test_rate_limit*.py tests/test_database_rate_limit_store_contracts.py -q: 42 passed, 1 existing StarletteDeprecationWarning
Ruff: uv run --locked --group dev ruff check tests/test_rate_limit_store.py tests/test_rate_limit_store_degraded_contracts.py tests/test_database_rate_limit_store_contracts.py tests/test_rate_limit_store_settings_contracts.py: passed
Git whitespace: git diff --check: passed
```

Changed-file LOC audit:

```text
tests/test_rate_limit_store.py: 157 pure LOC
tests/test_rate_limit_store_degraded_contracts.py: 108 pure LOC
tests/test_database_rate_limit_store_contracts.py: 106 pure LOC
tests/test_rate_limit_store_settings_contracts.py: 29 pure LOC
```

## Follow-up

> [!todo]
> Backend rate-limit suite에는 아직 route coverage/profile/social/moderation/worklog review 관련 split 후보가 남아 있다. 서버/인프라/CI/CD 보류가 해제되기 전까지는 런타임 변경 없이 contract/test reviewability 개선 단위로만 진행한다.
