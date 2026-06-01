---
title: Commercial Readiness Hardening - Backend OAuth Username and Model Privacy Scan 2026-06-01
aliases:
  - Backend OAuth username bootstrap
  - Backend model privacy scan fallback
  - AgentFeed dead profile link prevention

tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/privacy
status: in-progress
created: 2026-06-01
repositories:
  - agentfeed-backend
---

# Commercial Readiness Hardening - Backend OAuth Username and Model Privacy Scan 2026-06-01

## 목표

> [!abstract]
> 신규 GitHub OAuth 사용자가 public author/profile link에서 즉시 404가 나지 않도록 username을 bootstrap하고, Backend publish fallback privacy scan이 공개 `model` 필드의 secret도 차단하도록 합니다.

## 변경 계약

### GitHub OAuth username bootstrap

- 신규 GitHub auth user 생성 시 `github_data["login"]`이 있으면 username 후보로 사용합니다.
- Username은 app contract와 같게 lowercase + `[a-z0-9_-]` 범위로 normalize합니다.
- 기존 username과 충돌하면 `base`, `base-2`, `base-3` 순서로 deterministic하게 unique username을 찾습니다.
- GitHub login이 없거나 sanitize 후 유효하지 않으면 기존처럼 `username=None`을 유지합니다.
- 이미 연결된 existing user path는 username을 변경하지 않습니다.

### Publish fallback privacy scan

- `privacy_scan_json=None` 상태에서 public/unlisted publish 요청이 들어오면 Backend fallback scan이 `model` 필드도 검사합니다.
- `model`에서 secret pattern이 발견되면 `UnresolvedPrivacyFinding`으로 publish를 차단하고 finding field는 `model`이어야 합니다.

## 구현 파일

- `agentfeed-backend/app/services/auth.py`
- `agentfeed-backend/app/routers/worklogs.py`
- `agentfeed-backend/tests/test_contracts.py`

## 검증 증거

> [!success] RED → GREEN
> - RED: `uv run pytest tests/test_contracts.py -k "github_login_assigns_unique_sanitized_username_from_login or github_login_preserves_missing_login_without_username or publish_server_privacy_scan_blocks_secret_in_model_field_when_scan_missing"` → 2 failed, 1 passed.
> - Lint: `uv run ruff check app/services/auth.py app/routers/worklogs.py tests/test_contracts.py` → All checks passed.
> - Targeted GREEN: 같은 `pytest -k ...` → 3 passed.
> - Backend regression: `uv run pytest tests/test_contracts.py tests/test_rate_limit_store.py tests/test_auth_maintenance.py` → 268 passed, 1 warning.
> - Cross-repo gate: `../agentfeed-dev/scripts/test-all.sh` → CLI 296, Frontend CI/build, Backend 268, Alembic chain 통과.



> [!bug] Verifier regression repair
> 독립 verifier가 username availability check와 `flush()` 사이의 DB unique race를 재현했습니다. 신규 user flush에서 `IntegrityError`가 발생하면 rollback 후 existing GitHub auth account를 재확인하고, 없으면 충돌 username을 제외한 다음 suffix 후보로 재시도합니다.
>
> - RED: `uv run pytest tests/test_contracts.py -k "github_login_retries_username_suffix_after_unique_flush_race"` → unhandled `IntegrityError` 실패.
> - GREEN: `uv run pytest tests/test_contracts.py -k "github_login_retries_username_suffix_after_unique_flush_race or github_login_assigns_unique_sanitized_username_from_login or github_login_preserves_missing_login_without_username" && uv run ruff check app/services/auth.py tests/test_contracts.py` → 3 passed + ruff 통과.
> - Backend regression after repair: `uv run ruff check app/services/auth.py app/routers/worklogs.py tests/test_contracts.py && uv run pytest tests/test_contracts.py tests/test_rate_limit_store.py tests/test_auth_maintenance.py` → 268 passed, 1 warning.

## 남은 검증

- [ ] Remote GitHub CI

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Auth & Credential Safety#2026-06-01 Backend OAuth username bootstrap]]
- [[Privacy Safety#2026-06-01 Backend model privacy fallback scan]]
- [[Integration - CLI Backend Frontend#2026-06-01 Backend OAuth username and model privacy scan]]
