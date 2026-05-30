---
title: Auth & Credential Safety
aliases:
  - AgentFeed Credential Safety
  - CLI Login Safety
tags:
  - agentfeed/auth
  - agentfeed/cli
  - security/credentials
status: active
created: 2026-05-30
---

# Auth & Credential Safety

> [!abstract] 목적
> AgentFeed CLI가 브라우저 로그인과 token login을 제공하되, 사용자가 원할 때 로컬 credential 파일을 남기지 않는 안전한 경로를 보장합니다.

## 2026-05-30 CLI ephemeral login --no-save

> [!success]
> `agentfeed login --no-save`와 `agentfeed login --token <token> --no-save`는 `~/.agentfeed/credentials.json`을 생성하지 않습니다.

### 계약

- 기본 로그인은 기존처럼 credential file에 저장합니다.
- `--no-save`가 있으면 현재 명령 안에서 credential object만 구성하고 저장하지 않습니다.
- 브라우저 로그인도 approval/token exchange는 수행하지만, token을 파일이나 URL에 노출하지 않습니다.
- `--no-save` 이후의 다른 명령은 저장 credential을 기대하지 않고 `AGENTFEED_TOKEN` 또는 다시 저장 로그인해야 합니다.

### 구현 포인트

- `credentialsFromToken()`은 `resolveApiBaseUrl()` 검증/정규화를 재사용해 ephemeral credential을 만듭니다.
- `saveCredentials()`는 같은 helper를 사용해 기존 저장 동작과 필드 구성을 공유합니다.
- `browserLogin({ save: false })`는 CLI auth session exchange 후 `credentialsFromToken()`만 호출합니다.
- `cmdLogin`은 `--no-save`를 token login과 browser login 모두에 전달합니다.

### 검증

- RED 확인: `npx vitest run tests/config.test.ts tests/api-hook.test.ts`가 ephemeral helper 누락과 browser login 저장 문제로 실패
- GREEN 확인: `npx vitest run tests/config.test.ts tests/api-hook.test.ts`
- 전체 CLI gate:
  - `npm run typecheck`
  - `npm test -- --run`
  - `npm run build`
- `../agentfeed-dev/scripts/test-all.sh`
- 실제 CLI smoke:
  - `HOME=$(mktemp -d) node dist/cli/index.js login --token af_live_ephemeral --api-base-url http://localhost:8001/v1 --no-save`
  - `~/.agentfeed/credentials.json` 미생성 확인
  - 저장 로그인 후 `agentfeed status`가 `User/token: configured`를 표시하는지 확인

> [!warning]
> `--no-save`는 token을 출력하지 않습니다. 보안상 브라우저 교환 결과 token을 터미널에 노출하지 않으며, ephemeral 사용이 필요하면 `AGENTFEED_TOKEN` 환경변수를 사용합니다.

## 2026-05-30 GitHub OAuth state CSRF protection

> [!success]
> Backend GitHub OAuth login은 이제 signed state와 HttpOnly cookie를 함께 검증한 뒤에만 GitHub token exchange를 진행합니다.

### 계약

- `/v1/auth/github`는 매 요청마다 random nonce를 포함한 state를 생성합니다.
- state payload는 Backend `SECRET_KEY` 기반 HMAC으로 서명합니다.
- 같은 state 값을 `agentfeed_oauth_state` HttpOnly cookie에도 저장합니다.
- `/v1/auth/github/callback`은 query `state`와 cookie state가 일치하고 signature가 유효한 경우에만 `next` path를 복원합니다.
- state 검증 실패 시 GitHub code/token exchange를 시작하지 않습니다.
- callback 성공 후 OAuth state cookie는 삭제합니다.

### 검증

- RED: invalid state callback 테스트가 기존 구현에서 GitHub token exchange를 먼저 호출해 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'oauth_state or github_login_sets or invalid_oauth_state'`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/routers/auth.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!warning]
> 이 변경은 배포 중 이미 시작된 GitHub OAuth redirect에는 영향을 줄 수 있습니다. 새 login 시작부터는 state cookie가 발급되므로 정상 동작합니다.

## 2026-05-30 Deleted user ingestion-token invalidation

> [!success]
> Soft-deleted user는 JWT/cookie 인증뿐 아니라 `af_live_...` ingestion token 인증에서도 즉시 거부됩니다.

### 계약

- Backend `get_ingestion_user()`는 ingestion token row가 유효하더라도 소유 user가 active(`users.deleted_at IS NULL`)인 경우에만 인증을 허용합니다.
- user가 삭제되었거나 active 조회에서 누락되면 `IngestionTokenInvalid`를 반환합니다.
- token의 `last_used_at`은 active user 확인 이후에만 갱신합니다.
- 따라서 soft-delete된 계정의 미회수 token은 이후 CLI upload/preflight에서 성공하지 않습니다.

### 검증

- RED: soft-deleted user 시뮬레이션에서 기존 구현이 `last_used_at`을 먼저 갱신해 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k ingestion_token`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/dependencies.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!important]
> 계정 삭제/비활성화 정책을 바꿀 때는 JWT 경로(`get_current_user_optional`)와 ingestion-token 경로(`get_ingestion_user`)의 active-user filter가 계속 같아야 합니다.

## 2026-05-30 CLI auth exchange active-user gate

> [!success]
> 브라우저 승인 후 CLI가 token을 교환하는 마지막 단계에서도 user active 상태를 다시 확인합니다.

### 문제

- 승인 시점에는 `get_current_user`가 active user만 허용합니다.
- 하지만 승인 직후부터 CLI exchange 직전 사이에 user가 soft-delete되면, 기존 exchange 경로는 `db.get(User, id)`만 사용해 새 ingestion token을 발급할 수 있었습니다.
- 이는 [[#2026-05-30 Deleted user ingestion-token invalidation]]의 사후 사용 차단과 별개로, 삭제된 계정에 새 token을 만들 수 있는 gap입니다.

### 계약

- `POST /v1/auth/cli/sessions/{session_id}/exchange`는 `users.deleted_at IS NULL` 조건으로 user를 다시 조회합니다.
- active user가 아니면 `UNAUTHORIZED`로 실패합니다.
- 실패 시 session status는 `approved`로 남고, `consumed_at`을 설정하지 않으며, 새 `IngestionToken`을 추가하지 않습니다.
- active user일 때만 raw `af_live_...` token이 생성되고 session이 `consumed`로 전환됩니다.

### 검증

- RED: exchange가 `db.get(User, id)`로 deleted user에게 token을 발급해 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'cli_auth_exchange'`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/routers/auth.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI credential file permissions

> [!success]
> 저장 로그인으로 생성되는 `~/.agentfeed` 디렉터리와 `credentials.json` 파일을 private POSIX mode로 고정했습니다.

### 문제

- `saveCredentials()`가 일반 `ensureDir()` / `writeJson()`을 사용하면 디렉터리가 사용자 umask에 따라 `0755`처럼 group/world-readable이 될 수 있습니다.
- 파일은 사후 `chmod(0600)`이 있었지만, 생성 순간의 default permission과 상위 디렉터리 공개 permission이 token 저장소 관점에서 약했습니다.

### 계약

- `~/.agentfeed`는 저장 로그인 시 `0700`으로 생성/보정합니다.
- `~/.agentfeed/credentials.json`은 `0600`으로 생성/보정합니다.
- POSIX permission이 없는 filesystem에서는 best-effort로 실패를 삼키되, 기본 저장 경로는 private-by-default를 유지합니다.

### 검증

- RED: `npx vitest run tests/config.test.ts --testNamePattern 'private POSIX'`가 기존 `0755` directory mode로 실패
- GREEN:
  - `npx vitest run tests/config.test.ts --testNamePattern 'private POSIX'`
  - `npm test -- --run tests/config.test.ts tests/version.test.ts`
  - `npm run typecheck`
  - `npm pack --dry-run`
  - `../agentfeed-dev/scripts/test-all.sh`

> [!important]
> token 저장소 관련 변경은 [[Integration - CLI Backend Frontend#2026-05-30 CLI npm prepack release gate|release packaging gate]]와 함께 검증해, npm 배포 tarball이 최신 credential storage 코드를 포함하도록 유지합니다.


## 2026-05-30 Backend critical path rate-limit

> [!success]
> Browser/CLI auth와 token-backed ingest/social/comment mutation은 최소 rate-limit gate를 통과해야 합니다.

보안 계약:

- CLI auth session 생성/승인/교환은 endpoint별 bucket으로 제한합니다.
- GitHub OAuth 시작/callback도 IP bucket으로 제한합니다.
- Ingestion token 요청은 token fingerprint bucket을 우선 사용해 같은 사용자의 upload burst를 제한합니다.
- Social/comment mutation은 resource UUID를 `{id}`로 정규화해 resource id를 바꿔도 같은 endpoint bucket에 걸립니다.
- 429는 `RATE_LIMITED` error code와 `Retry-After` header를 제공합니다.

> [!note]
> Production/non-development scale-out bucket은 이후 [[#2026-05-30 Shared database rate-limit store]]에서 Postgres shared store로 보강했습니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Backend critical path rate-limit]]


## 2026-05-30 Auth account maintenance dry-run

> [!success]
> 운영 DB에 남아 있을 수 있는 duplicate GitHub provider identity와 legacy plaintext provider token을 배포 전/후에 JSON report로 점검할 수 있습니다.

계약:

- `scripts/auth_account_maintenance.py` 기본 실행은 dry-run이며 token 값을 출력하지 않습니다.
- duplicate `(provider, provider_user_id)` group은 `auth_account_ids` / `user_ids`만 출력하고 자동 merge하지 않습니다.
- `--apply`는 duplicate가 없을 때만 legacy plaintext provider token을 `af1:` encrypted form으로 rotate합니다.
- rotation path는 기존 auth flow의 `rotate_legacy_provider_tokens()` helper를 재사용합니다.
- apply mode는 대상 row를 `FOR UPDATE SKIP LOCKED`로 잡아 운영 중복 실행의 충돌 가능성을 줄입니다.

관련 구현: [[Commercial Readiness Hardening - Auth Maintenance and Rendered Smoke 2026-05-30]]


## 2026-05-30 Ingestion token quota and issue gate

> [!success]
> Browser-login exchange와 수동 ingestion token 생성이 같은 quota-aware issuance helper를 사용합니다.

계약:

- `MAX_ACTIVE_INGESTION_TOKENS_PER_USER`는 기본 50이며 1보다 작으면 startup validation에서 실패합니다.
- token 발급 전 active user row를 `FOR UPDATE`로 잠그고, revoked 되지 않은 active token 수를 확인합니다.
- quota 초과 시 `INGESTION_TOKEN_LIMIT_EXCEEDED` 409로 실패하며 raw token을 만들거나 DB row를 추가하지 않습니다.
- CLI auth exchange는 quota 초과 시 session을 consumed 처리하지 않습니다.
- `/v1/me/ingestion-tokens` create/delete mutation은 rate-limit bucket에 포함됩니다.
- token name은 trim 후 1~100자로 제한합니다.

관련 구현: [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 CLI ephemeral login --no-save]]
- [[Integration - CLI Backend Frontend#2026-05-30 GitHub OAuth state CSRF protection]]
- [[Integration - CLI Backend Frontend#2026-05-30 Deleted user ingestion-token invalidation]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI auth exchange active-user gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI login/token smoke 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI npm prepack release gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI credential file permissions]]
- [[Integration - CLI Backend Frontend#2026-05-30 Backend critical path rate-limit]]
- [[Commercial Readiness Hardening - Auth Maintenance and Rendered Smoke 2026-05-30]]
- [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]
- [[Privacy Safety]]
- [[Active Tasks#P1 후보]]

## 2026-05-30 OAuth state payload expiry

> [!success]
> GitHub OAuth state는 cookie lifetime에만 의존하지 않고 signed payload 내부 만료 시간도 검증합니다.

보안 계약:

- state payload에는 `next`, random `nonce`, `exp`가 포함됩니다.
- query state와 HttpOnly cookie state는 byte-for-byte 일치해야 합니다.
- HMAC signature가 유효해야 합니다.
- `exp`가 없거나 현재 시각보다 과거이면 `OAUTH_STATE_INVALID`로 실패합니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 OAuth state payload expiry]]

## 2026-05-30 Header OAuth next preservation

> [!success]
> Header에서 시작한 GitHub OAuth login은 현재 route context를 `next`로 보존합니다.

계약:

- Header Sign in / Get started는 현재 path와 query string을 `next`에 담습니다.
- protocol-relative path는 `/`로 정규화해 open redirect 입력이 되지 않게 합니다.
- CLI authorize page의 기존 next-preservation pattern과 동일한 흐름을 사용합니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Header OAuth next preservation]]

## 2026-05-30 Frontend OAuth next allowlist

> [!success]
> Browser login redirect target은 명시적으로 허용한 AgentFeed route만 유지합니다.

보안 계약:

- 허용 route는 `/`, `/feed`, `/explore`, `/leaderboard`, `/projects`, `/search`, `/dashboard`, `/notifications`, `/docs`, `/privacy`, `/terms`, `/changelog`, `/cli/authorize`와 public dynamic prefix(`/profile/`, `/projects/`, `/worklog/`, `/worklogs/`)입니다.
- protocol-relative URL, absolute URL, `javascript:` 같은 scheme-like 값, encoded `//`, encoded/raw backslash, whitespace/control char, `.`/`..` segment는 거부합니다.
- unsafe next는 query를 보존하지 않고 `/`로 fallback합니다.
- `auth.githubUrl(next)` 직접 호출도 unsafe next를 OAuth query param에 싣지 않습니다.
- CLI authorize return path(`/cli/authorize?session_id=...`)는 유지하되 session id는 encoded query로만 전달합니다.

검증:

- OAuth next contract tests가 safe query/repeated params/encoded values/CLI authorize path를 보존하는지 확인합니다.
- unsafe path matrix가 `/` fallback 및 top-level OAuth `next` 생략을 확인합니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Frontend OAuth next allowlist + runtime API config UI]]

## 2026-05-30 CLI credential trust boundary hardening

> [!success]
> 저장된 ingestion token은 더 이상 repo-local `.env`가 가리키는 임의 API host로 조용히 전송되지 않습니다.

보안 계약:

- 명시 CLI option / `AGENTFEED_API_BASE_URL` 환경변수는 여전히 최우선 override입니다.
- 저장된 credential에 `api_base_url`이 있으면 repo-local `.env` discovery보다 우선합니다.
- credential 저장 위치는 `AGENTFEED_HOME` / `HOME` / `USERPROFILE` / `os.homedir()` 중 안전한 home만 사용합니다.
- 안전한 home을 찾지 못하면 project cwd에 fallback하지 않고 저장을 실패시킵니다.
- upload success와 duplicate response는 `review_url` origin/shape 검증을 통과해야 local draft를 uploaded로 표시합니다.

검증:

- `npm test -- --run tests/config.test.ts tests/privacy.test.ts tests/api-hook.test.ts`
- `npm run typecheck && npm test`

관련: [[Commercial Readiness Audit 2026-05-30#CLI token / local privacy boundary]]

## 2026-05-30 Trusted proxy rate-limit identity

> [!success]
> Rate-limit identity는 더 이상 client가 임의로 보낸 forwarding header를 기본 신뢰하지 않습니다.

보안 계약:

- Authorization bearer token / access token cookie가 있으면 기존처럼 token fingerprint bucket을 우선 사용합니다.
- token이 없는 요청은 기본적으로 socket `request.client.host`를 IP identity로 사용합니다.
- `X-Forwarded-For` / `X-Real-IP`는 `request.client.host`가 `TRUSTED_PROXY_IPS` allowlist에 포함될 때만 사용합니다.
- XFF chain은 오른쪽부터 trusted proxy hop을 제거한 뒤 rightmost untrusted IP를 선택합니다.
- invalid forwarded value는 무시하고 socket client IP로 fallback합니다.
- `TRUSTED_PROXY_IPS`는 comma-separated IP 또는 CIDR을 지원합니다.
- 운영 scale-out bucket은 [[#2026-05-30 Shared database rate-limit store]]의 Postgres shared store로 보강했습니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'rate_limit_identity'`
- `uv run --with pytest --with pytest-asyncio pytest -q` → 89 passed

관련: [[Commercial Readiness Audit 2026-05-30#2026-05-30 backend 운영 보안 추가 루프]]


## 2026-05-30 Shared database rate-limit store

> [!success]
> Production-like backend는 process-local memory limiter로 시작하지 않고 database-backed shared limiter를 사용합니다.

보안 계약:

- `RATE_LIMIT_STORE=auto`는 development에서 `memory`, non-development에서 `database`입니다.
- `RATE_LIMIT_STORE=memory`는 non-development에서 startup validation error로 거부합니다.
- Database store는 `rate_limit_events`에 bucket events를 저장하지만 identity는 SHA-256 hash만 저장합니다.
- Bucket check는 PostgreSQL transaction-scoped advisory lock으로 serialize합니다.
- Endpoint/identity isolation, window expiry, retry-after 계산은 async shared-store path에서도 유지됩니다.

검증:

- `tests/test_rate_limit_store.py`
  - two-worker shared bucket block
  - endpoint/identity bucket isolation
  - shared window expiry/retry-after
  - database advisory lock + identity hash persistence
  - production config fail-closed
- `pytest tests -q` → 95 passed
- Alembic offline chain에서 `006_rate_limit_events` 생성 확인

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Backend shared database rate-limit store]]

## 2026-05-30 Backend production environment fail-closed

> [!success]
> Backend는 `ENVIRONMENT=production` exact match에만 의존하지 않고 non-development 환경을 production-like로 취급합니다.

보안 계약:

- `development`, `dev`, `local`만 development 환경입니다.
- `prod`, `staging`, 빈 값 등 development가 아닌 값은 production-like로 간주해 secure secret, non-default database URL, GitHub OAuth 값, public HTTPS redirect/frontend/origin을 요구합니다.
- empty `ALLOWED_ORIGINS`는 production-like 환경에서 실패합니다.
- public HTTPS URL 검증은 loopback/private IP와 trailing-dot localhost를 거부합니다.
- `ENVIRONMENT=development`는 localhost/loopback URL만 허용합니다. public URL이 설정되면 명시적으로 production-like environment를 사용해야 합니다.
- `settings.is_production`은 non-development에서 true가 되어 auth cookie `Secure` flag 같은 runtime policy도 fail-closed 됩니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'production_settings or development_settings or non_development_settings'`
- `uv run --with pytest --with pytest-asyncio pytest -q` → 89 passed

관련: [[Commercial Readiness Audit 2026-05-30#2026-05-30 backend 운영 보안 추가 루프]]

## 2026-05-30 Worklog and project mutation rate-limit coverage

> [!success]
> Worklog/project write paths and privacy-finding publish/resolve paths are now explicitly represented in Backend rate-limit rules.

계약:

- `POST/PATCH/DELETE /v1/worklogs`와 `POST/PATCH/DELETE /v1/projects` 계열 mutation은 bucket을 갖습니다.
- `POST /v1/worklogs/{id}/privacy-findings/{id}/resolve`, publish, unpublish도 bucket을 갖습니다.
- nested resource ids are normalized so equivalent resource-shaped paths share the intended bucket key.
- Rate-limit identity and persistence policy는 기존 [[Auth & Credential Safety#2026-05-30 Shared database rate-limit store|shared database rate-limit store]] 계약을 따릅니다.

관련 구현: [[Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30]]

## 2026-05-30 Ingestion token expiry policy

> [!success]
> Ingestion token은 더 이상 수동 revoke 전까지 무기한 유효하지 않고, `INGESTION_TOKEN_TTL_DAYS` 정책에 따라 `expires_at`을 갖습니다.

계약:

- `INGESTION_TOKEN_TTL_DAYS` 기본값은 90일이며 1보다 작으면 startup validation에서 실패합니다.
- `ingestion_tokens.expires_at`은 non-null 컬럼입니다.
- 새 token 발급은 `issue_ingestion_token()` helper가 `expires_at`을 설정합니다.
- active token quota는 revoked token과 expired token을 제외하고 계산합니다.
- `get_ingestion_user()`는 만료 token을 `INGESTION_TOKEN_INVALID`로 거부하고 `revoked_at`을 기록합니다.
- token list/integration status는 expired token을 active로 보지 않습니다.

검증:

- `uv run --python 3.12 --locked --group dev ruff check .`
- `uv run --python 3.12 --locked --group dev pytest tests -q`
- `../agentfeed-dev/scripts/test-all.sh`
- `../agentfeed-dev/scripts/smoke-e2e.sh`

관련 구현: [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]
