---
title: Backend Cookie Payload Boundary Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contracts
  - verification
status: done
---

# Backend Cookie Payload Boundary Contract Split 2026-06-10

## 목적

Backend의 대형 `tests/test_contracts.py` 안에 남아 있던 CORS preflight, cookie 기반 CSRF origin guard, request payload limit 계약 테스트를 별도 파일로 분리했다. 신규 기능 추가 없이 기존 계약을 더 작은 검증 단위로 쪼개서, CLI-Frontend-Backend 계약 회귀를 찾기 쉽게 만드는 것이 목표였다.

> [!info] Goal 제약
> 이번 패스는 서버/인프라/CICD 작업을 하지 않았다. 개인서버 배포도 수행하지 않고 로컬 검증과 cross-repo 계약 게이트만 실행했다.

## 변경 파일

- Backend
  - `tests/test_cookie_payload_boundary_contracts.py` 신규 생성
  - `tests/test_contracts.py`에서 이동된 테스트와 미사용 `FakeBodyRequest` 제거

## 이동한 계약 테스트

- `test_cors_preflight_allows_configured_frontend_origin`
- `test_cors_preflight_rejects_unconfigured_frontend_origin`
- `test_cookie_authenticated_mutations_require_allowed_origin`
- `test_cookie_authenticated_mutation_origin_failure_returns_controlled_403`
- `test_ingest_payload_limit_rejects_spoofed_small_content_length`
- `test_ingest_payload_limit_rejects_chunked_body_without_content_length`
- `test_mutating_non_ingest_payloads_are_size_limited`

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'cors_preflight or cookie_authenticated_mutations_require_allowed_origin or cookie_authenticated_mutation_origin_failure_returns_controlled_403 or ingest_payload_limit_rejects_spoofed_small_content_length or ingest_payload_limit_rejects_chunked_body_without_content_length or mutating_non_ingest_payloads_are_size_limited'
# 7 passed, 250 deselected, 1 warning
```

```bash
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_cookie_payload_boundary_contracts.py
# All checks passed!
```

```bash
uv run --locked --group dev pytest tests/test_cookie_payload_boundary_contracts.py tests/test_contracts.py
# 257 passed, 1 warning
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

- CORS/CSRF/payload limit 계약이 전용 파일로 분리되어 request boundary 회귀를 더 좁은 범위에서 확인할 수 있다.
- `tests/test_cookie_payload_boundary_contracts.py`는 192 lines로 250 LOC ceiling 안에 유지했다.
- `tests/test_contracts.py`는 7101 lines로 줄었지만 여전히 oversized legacy contract file이다.
- 동작 계약은 변경하지 않았다.

## 후행 과제

- [[Backend Rate Limit Boundary Contract Split]]: `test_contracts.py`에 남은 rate-limit identity/response 테스트를 이미 존재하는 `tests/test_rate_limit_boundary_contracts.py`로 이동한다.
- [[Backend Model Query Privacy Contract Split]]: `test_worklog_model_has_user_note_column`, bookmark visibility query 테스트처럼 DB model/query privacy 성격의 잔여 테스트를 별도 파일로 분리한다.
- `tests/test_contracts.py`를 계속 줄여 250 LOC 원칙에 가까운 cohesive contract 파일들로 분해한다.
