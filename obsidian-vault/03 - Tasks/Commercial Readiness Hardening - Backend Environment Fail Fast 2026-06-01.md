---
title: Commercial Readiness Hardening - Backend Environment Fail Fast 2026-06-01
aliases:
  - Backend ENVIRONMENT Fail Fast
  - Backend Deployment Environment Allowlist
tags:
  - agentfeed/backend
  - agentfeed/config
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Backend Environment Fail Fast 2026-06-01

## 목적

Backend 배포 환경명이 오타나 누락으로 들어왔을 때, `SECRET_KEY`나 URL 검증 같은 2차 오류 뒤에 숨지 않고 startup 단계에서 즉시 실패하도록 고정했습니다.

> [!important]
> 운영 계열 환경명은 명시 allowlist로만 인정합니다. 현재 유효 값은 `development`, `dev`, `local`, `production`, `staging`입니다.

## 수정 요약

- `app/config.py`에 `PRODUCTION_ENVIRONMENTS`와 `VALID_ENVIRONMENTS` allowlist를 분리했습니다.
- `validate_production_safety()` 첫 단계에서 `ENVIRONMENT` allowlist를 검증합니다.
- `is_production`은 더 이상 “non-development 전체”가 아니라 `production|staging`에만 `True`를 반환합니다.
- `prod`, 빈 문자열, `test` 같은 미지원 환경명은 `ENVIRONMENT must be one of: ...` 오류로 fail-fast합니다.

## 계약

- Database/backend runtime 기준 배포 환경명은 Backend config allowlist가 source of truth입니다.
- production-like 안전 검사는 `ENVIRONMENT` 이름이 유효한 뒤에만 진행합니다.
- `staging`은 production-safe 정책을 적용받는 유효 환경입니다.
- 새 alias를 추가하려면 `VALID_ENVIRONMENTS`와 contract test를 함께 수정해야 합니다.

> [!warning]
> `test`를 production-like alias로 조용히 받아들이지 않습니다. 테스트 환경은 명시적으로 `development` 계열 설정 또는 별도 검증된 alias 추가를 거쳐야 합니다.

## TDD 기록

> [!bug] RED
> `tests/test_contracts.py::test_non_development_settings_fail_closed_for_unknown_env_defaults`를 먼저 변경해 `ENVIRONMENT="prod"`, `""`, `"test"`가 환경명 오류로 실패해야 함을 고정했습니다. 구현 전에는 `SECRET_KEY` 검증 오류가 먼저 발생했습니다.

> [!success] GREEN
> `Settings._require_valid_environment()`를 추가하고 `is_production`을 explicit production set 기반으로 변경한 뒤 targeted contract test가 통과했습니다.

## 검증 증거

- Backend targeted contract tests:
  - `.venv/bin/pytest -q tests/test_contracts.py::test_non_development_settings_fail_closed_for_unknown_env_defaults tests/test_contracts.py::test_production_settings_accept_explicit_secure_urls tests/test_contracts.py::test_development_settings_allow_only_local_runtime_urls`
  - 결과: `3 passed in 0.38s`
- Backend full gate:
  - `.venv/bin/ruff check .` → `All checks passed!`
  - `.venv/bin/pytest` → `226 passed, 1 warning`
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/preflight, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과

## 남은 리스크

> [!note]
> 실제 배포 플랫폼에서 missing `ENVIRONMENT`와 production secrets 조합까지 end-to-end startup으로 재확인하지는 않았습니다. 다만 설정 객체 contract와 dev 통합 gate는 통과했습니다.

## 관련 링크

- [[Runtime Configuration#2026-06-01 Backend ENVIRONMENT fail-fast]]
- [[Integration - CLI Backend Frontend#2026-06-01 Backend ENVIRONMENT fail-fast]]
- [[Active Tasks#P1 후보]]
