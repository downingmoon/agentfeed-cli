---
title: Backend Current User Session Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - auth
  - session
  - current-user
status: done
---

# Backend Current User Session Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 current-user/session revocation 계약 테스트 5개를 `tests/test_current_user_session_contracts.py`로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Current-user boundary는 Frontend authenticated surfaces, Backend cookie/bearer fallback, logout revocation, browser session version binding이 공유하는 인증 계약이다.
- Malformed JWT `sub`, stale browser cookie + valid bearer fallback, logout 이전 token revocation, browser session version mismatch가 catch-all에 남아 있으면 auth regression 원인과 영향 범위를 좁히기 어렵다.
- Enterprise-readiness 목표상 신규 기능보다 인증 세션 경계를 dedicated contract file로 고정해 CLI-API-Frontend 간 인증 상태 불일치 탐지력을 높이는 것이 우선이다.

## Changed

- `agentfeed-backend/tests/test_current_user_session_contracts.py`
  - `test_current_user_optional_treats_malformed_jwt_sub_as_anonymous`
  - `test_current_user_optional_uses_valid_bearer_when_browser_cookie_is_invalid`
  - `test_current_user_optional_rejects_tokens_before_logout_revocation`
  - `test_current_user_optional_rejects_browser_session_version_mismatch`
  - `test_logout_revokes_existing_browser_session_tokens`
- `agentfeed-backend/tests/test_contracts.py`
  - current-user/session revocation 테스트 5개 제거

## Size

```text
2257 tests/test_contracts.py
 101 tests/test_current_user_session_contracts.py
2358 total
```

## Verification Evidence

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved current-user session tests>'
# baseline before split: 5 passed, 92 deselected in 0.55s
```

```text
uv run --locked --group dev pytest tests/test_current_user_session_contracts.py
# 5 passed in 0.62s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved current-user session tests>'
# 92 deselected / 0 selected, exit_code=5 after split
```

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_current_user_session_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 2.43s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Strict client JSON error responses checked: 347
# Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false
```

```text
bash scripts/test-all.sh
# CLI: 591 passed; typecheck; release preflight; npm audit 0 vulnerabilities
# Frontend: typecheck; mock API compatibility; production build; npm audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Follow-up

- [ ] Continue decomposing `tests/test_contracts.py` by shared schema/model boundaries and remaining cursor/public-list contracts.
- [ ] Keep future `get_current_user_optional`, bearer/cookie fallback, logout revocation, and browser session version tests in `test_current_user_session_contracts.py`.
- [ ] Keep GitHub OAuth redirect/state/token exchange behavior in existing OAuth-focused files to avoid mixing login flow and current-user session lookup contracts.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
