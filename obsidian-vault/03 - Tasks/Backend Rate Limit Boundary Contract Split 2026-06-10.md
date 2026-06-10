---
title: Backend Rate Limit Boundary Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contracts
  - rate-limit
  - verification
status: done
---

# Backend Rate Limit Boundary Contract Split 2026-06-10

## 목적

Backend의 oversized `tests/test_contracts.py`에 남아 있던 rate-limit path, token identity, IP/proxy identity 계약 테스트를 응집도 높은 전용 파일로 분리했다. 신규 기능 추가 없이 기존 rate-limit 계약을 더 작고 독립적인 검증 단위로 만들기 위한 작업이다.

> [!info] Goal 제약
> 이번 패스는 서버/인프라/CICD를 변경하지 않았다. 개인서버 배포도 수행하지 않았다.

## 변경 파일

- Backend
  - `tests/rate_limit_fakes.py` 신규 생성
  - `tests/test_rate_limit_path_contracts.py` 신규 생성
  - `tests/test_rate_limit_token_identity_contracts.py` 신규 생성
  - `tests/test_rate_limit_ip_identity_contracts.py` 신규 생성
  - `tests/test_contracts.py`에서 이동된 테스트와 미사용 `FakeRateRequest` 제거

## 이동한 계약 테스트

### Path / bucket / response

- `test_health_rate_limit_rules_are_ip_based_and_normalize_root_paths`
- `test_health_routes_return_rate_limit_contract_when_ip_exceeds_route_rule`
- `test_rate_limit_normalizes_resource_ids_to_shared_buckets`
- `test_rate_limit_blocks_after_endpoint_limit_without_cross_endpoint_bleed`
- `test_request_rate_limit_uses_normalized_path_and_response_contract`

### Token identity

- `test_public_bootstrap_rate_limit_identity_ignores_random_bearer_values`
- `test_rate_limit_identity_prefers_valid_user_subject_then_trusted_forwarded_ip_without_leaking_token`
- `test_rate_limit_identity_matches_auth_cookie_then_bearer_precedence_for_mixed_clients`
- `test_rate_limit_identity_buckets_multiple_valid_tokens_by_user_subject`

### IP / proxy identity

- `test_ip_based_rate_limit_identity_ignores_valid_jwt_subjects`
- `test_unmatched_rate_limit_identity_uses_ip_bucket_even_with_valid_jwt`
- `test_protected_rate_limit_identity_ignores_invalid_bearer_values`
- `test_rate_limit_identity_can_trust_x_real_ip_only_from_allowlisted_proxy`
- `test_rate_limit_identity_uses_rightmost_untrusted_forwarded_ip_and_rejects_invalid_values`

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'health_rate_limit_rules_are_ip_based_and_normalize_root_paths or health_routes_return_rate_limit_contract_when_ip_exceeds_route_rule or rate_limit_normalizes_resource_ids_to_shared_buckets or rate_limit_blocks_after_endpoint_limit_without_cross_endpoint_bleed or public_bootstrap_rate_limit_identity_ignores_random_bearer_values or rate_limit_identity_prefers_valid_user_subject_then_trusted_forwarded_ip_without_leaking_token or rate_limit_identity_matches_auth_cookie_then_bearer_precedence_for_mixed_clients or rate_limit_identity_buckets_multiple_valid_tokens_by_user_subject or ip_based_rate_limit_identity_ignores_valid_jwt_subjects or unmatched_rate_limit_identity_uses_ip_bucket_even_with_valid_jwt or protected_rate_limit_identity_ignores_invalid_bearer_values or rate_limit_identity_can_trust_x_real_ip_only_from_allowlisted_proxy or rate_limit_identity_uses_rightmost_untrusted_forwarded_ip_and_rejects_invalid_values or request_rate_limit_uses_normalized_path_and_response_contract'
# 14 passed, 236 deselected, 1 warning
```

```bash
uv run --locked --group dev pytest tests/test_rate_limit_path_contracts.py tests/test_rate_limit_token_identity_contracts.py tests/test_rate_limit_ip_identity_contracts.py
# 14 passed, 1 warning
```

```bash
uv run --locked --group dev ruff check tests/test_contracts.py tests/rate_limit_fakes.py tests/test_rate_limit_path_contracts.py tests/test_rate_limit_token_identity_contracts.py tests/test_rate_limit_ip_identity_contracts.py
# All checks passed!
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

- `tests/test_contracts.py`는 7101 lines에서 6574 lines로 줄었다.
- 새 파일들은 250 LOC ceiling 안에 유지했다.
  - `tests/rate_limit_fakes.py`: 18 lines
  - `tests/test_rate_limit_path_contracts.py`: 220 lines
  - `tests/test_rate_limit_token_identity_contracts.py`: 168 lines
  - `tests/test_rate_limit_ip_identity_contracts.py`: 110 lines
- rate-limit 계약 의미는 변경하지 않았다.

## 후행 과제

- [[Backend Model Query Privacy Contract Split]]: `test_worklog_model_has_user_note_column`, bookmark visibility query 테스트를 model/query privacy 전용 파일로 분리한다.
- `tests/test_contracts.py`의 remaining social/worklog/search 계약을 기능별 파일로 계속 분해한다.
- Frontend/CLI 계약 게이트는 통과했지만, runtime UX audit는 별도 패스로 계속 수행한다.
