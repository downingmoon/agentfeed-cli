---
title: Commercial Readiness Hardening - Sidecar P1 Trust Boundaries 2026-06-01
aliases:
  - Sidecar P1 Trust Boundaries
  - Env Token API Base Trust Boundary
  - OAuth Profile URL Import Safety
  - Invalid Bearer Rate Limit Identity
  - Worklog Nullable Clear Semantics
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Sidecar P1 Trust Boundaries 2026-06-01

## 목적

병렬 sidecar audit에서 기존 broad checklist가 놓친 path-specific P1 상용화 리스크를 확인했습니다. 이번 slice는 token/API-host trust boundary, OAuth-imported public URL safety, invalid-auth rate-limit identity, draft public-field clear semantics, 그리고 frontend CLI auth contract execution gap을 닫습니다.

## 발견 및 조치

### CLI 환경 토큰 API base trust boundary

> [!bug]
> `AGENTFEED_TOKEN`을 secret manager/CI에서 주입해도, 기존 `~/.agentfeed/credentials.json`의 `api_base_url`이 남아 있으면 환경 토큰이 saved custom/stale API host로 전송될 수 있었습니다.

조치:

- `AGENTFEED_TOKEN` 사용 시 saved credentials의 `api_base_url`은 무시합니다.
- 사용자가 non-default host를 의도하면 `AGENTFEED_API_BASE_URL`을 명시해야 합니다.
- metadata warning에 saved API base 무시 이유를 노출합니다.

### Backend GitHub OAuth profile URL import safety

> [!bug]
> GitHub profile `blog` 값이 `UpdateProfileRequest.website_url` validator를 거치지 않고 public profile `website_url`로 저장될 수 있었습니다.

조치:

- OAuth user creation 시 `blog`를 `validate_public_http_url()`로 정규화합니다.
- invalid/private/credentialed URL은 login 실패가 아니라 `None`으로 drop합니다.

### Backend invalid Bearer rate-limit identity

> [!bug]
> 보호 endpoint에서 rate-limit middleware가 auth 검증 전 임의 Bearer/cookie token 문자열을 token bucket으로 사용해, garbage token rotation으로 IP quota를 우회할 수 있었습니다.

조치:

- JWT가 구조적/암호적으로 valid할 때만 token bucket을 사용합니다.
- invalid Bearer/cookie token은 IP bucket으로 fallback합니다.

### Backend Worklog nullable clear semantics

> [!bug]
> `PATCH /v1/worklogs/{id}`가 `exclude_none=True`를 사용해 `public_prompt: null` 같은 명시 clear 요청을 no-op success로 처리했습니다.

조치:

- `exclude_unset=True`로 명시 null PATCH를 구분합니다.
- draft 상태에서는 `user_note`, `public_prompt`를 `None`, `outcome`, `changed_areas`, `tags`를 빈 배열로 clear합니다.
- published/public worklog는 null clear도 public-field edit으로 간주해 기존 publish immutability guard가 차단합니다.

### Frontend CLI auth contract execution

> [!bug]
> `src/lib/cli-auth.contract.ts`가 존재했지만 `scripts/run-contract-tests.mjs`에서 compile/run되지 않아 CLI authorize approve API path/method가 CI에서 증명되지 않았습니다.

조치:

- contract runner에 `cli-auth.contract.ts` compile + node 실행을 추가합니다.
- contract가 `auth.githubUrl('/cli/authorize?...')`, `cliAuth.approve(sessionId)` path/method/body를 mocked fetch로 검증합니다.

## 관련 smoke gate

- [[Commercial Readiness Hardening - Live Share Handoff Smoke Gate 2026-06-01]]

## 검증 계획

- CLI: `npm test -- --run tests/config.test.ts`, `npm run typecheck`
- Backend: targeted `pytest` for OAuth import, invalid Bearer identity, nullable clear semantics; `ruff check`
- Frontend: `npm run test:contracts`
- Cross-repo: `agentfeed-dev ./scripts/test-all.sh`
- Remote CI: push 후 CLI/Backend/Frontend 최신 run green 확인

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]


## 검증 증거

> [!success]
> Sidecar audit에서 발견한 P1 trust-boundary gap 5건을 구현하고 targeted + cross-repo gate로 재검증했습니다.

### Targeted

- CLI
  - `npm test -- --run tests/config.test.ts` → 25 passed
  - `npm run typecheck` → passed
- Backend
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py::test_github_login_sanitizes_imported_profile_blog_url tests/test_contracts.py::test_protected_rate_limit_identity_ignores_invalid_bearer_values tests/test_contracts.py::test_update_worklog_can_clear_nullable_draft_public_fields tests/test_contracts.py::test_rate_limit_identity_prefers_token_then_trusted_forwarded_ip_without_leaking_token tests/test_contracts.py::test_update_rejects_public_field_changes_after_publish` → 5 passed
  - `uv run --python 3.12 --locked --group dev ruff check app/services/auth.py app/middleware/rate_limit.py app/routers/worklogs.py tests/test_contracts.py` → passed
- Frontend
  - `npm run test:contracts` → passed

### Cross-repo

- `agentfeed-dev ./scripts/test-all.sh` → passed
  - CLI: 20 test files, 277 tests passed; typecheck, release preflight, `npm audit` 0 vulnerabilities
  - Frontend: typecheck, contract tests, production build, `npm audit` 0 vulnerabilities
  - Backend: `ruff check`, 250 pytest tests passed, Alembic offline migration chain 449 lines captured

## 완료 체크

- [x] CLI environment token은 explicit `AGENTFEED_API_BASE_URL` 없이는 saved custom API base를 상속하지 않음
- [x] Backend GitHub OAuth `blog` import는 public URL validator를 통과한 값만 저장
- [x] Backend protected rate-limit identity는 invalid Bearer/cookie token을 IP bucket으로 fallback
- [x] Backend draft worklog nullable public fields는 명시 `null` clear를 처리하고 published/public immutability는 유지
- [x] Frontend CLI auth approve contract가 contract runner에서 실제 실행됨
