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

## 2026-06-02 durable sensitive-action audit trail

> [!success]
> Token/auth lifecycle actions now leave durable audit rows without persisting raw tokens or approval secrets.

계약:

- CLI auth approve/exchange, ingestion token create/rotate/revoke, logout are audited.
- Audit metadata redacts token/verifier/approval-code/hash/secret keys and token-like values.
- Audit rows are added in the same request transaction as the sensitive mutation.

검증: [[Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02#검증 증거]]


## 2026-06-02 settings response section unwrap

> [!success]
> Frontend Settings PATCH now preserves flat privacy/notification section state when Backend returns the full settings object.

계약:

- `me.updatePrivacySettings()` unwraps `data.privacy`.
- `me.updateNotificationSettings()` unwraps `data.notifications`.
- Settings page partial save behavior remains independent per section.

검증: [[Commercial Readiness Hardening - Public Timeline Settings and URL Privacy 2026-06-02#검증 증거]]


## 2026-06-02 CLI browser approval code

> [!success]
> Browser-approved CLI token issuance now requires a terminal-visible human approval code, not just possession of a browser session link.

계약:

- Backend returns a `user_code` for each CLI auth session and stores only `approval_code_hash`.
- Frontend `/cli/authorize` requires the terminal code before approval.
- CLI `agentfeed login` prints the approval code and rejects auth session responses that omit it.
- Wrong/missing codes fail with `CLI_AUTH_USER_CODE_INVALID` and do not issue ingestion tokens.

검증: [[Commercial Readiness Hardening - CLI Approval Code Privacy Fallback and Public Adapter 2026-06-02#검증 증거]]


> [!abstract] 목적
> AgentFeed CLI가 브라우저 로그인과 token login을 제공하되, 사용자가 원할 때 로컬 credential 파일을 남기지 않는 안전한 경로를 보장합니다.



## 2026-06-01 Backend OAuth username bootstrap

> [!success]
> 신규 GitHub OAuth 사용자가 public profile/author link에서 즉시 접근 가능한 username을 갖도록 Backend 생성 경로를 보강했습니다.

계약:

- GitHub `login`은 app username 규칙으로 sanitize/normalize됩니다.
- Collision은 `base`, `base-2`, `base-3` 순서로 deterministic하게 해소합니다.
- Missing/invalid login은 기존처럼 `username=None`을 유지합니다.
- Existing linked auth account는 username을 새로 덮어쓰지 않습니다.

검증: [[Commercial Readiness Hardening - Backend OAuth Username and Model Privacy Scan 2026-06-01#검증 증거]]

## 2026-06-01 CLI upload cache and CI login guard

> [!success]
> CLI private review 재사용과 CI login 경계를 fail-closed로 보강했습니다.

계약:

- 이미 업로드된 local draft는 saved `payload_hash`가 현재 redacted ingest payload와 같을 때만 review URL을 재사용합니다.
- Local privacy redaction 이후 payload drift가 있으면 `DRAFT_UPLOAD_STALE`로 멈추고 network upload를 시도하지 않습니다.
- CI browser login guard는 `AGENTFEED_TOKEN` 존재 여부와 무관하게 기본 차단됩니다.
- CI에서는 existing token으로 non-login commands를 실행하거나 `login --token-stdin`을 사용합니다.

검증: [[Commercial Readiness Hardening - CLI Upload Cache and CI Login Guard 2026-06-01#검증 증거]]

## 2026-06-01 CLI auth URL minimization

> [!success]
> CLI browser approval session id는 최초 authorize URL에서만 캡처하고, OAuth roundtrip에는 `/cli/authorize` path만 넘기도록 정렬했습니다.

계약:

- Frontend는 `/cli/authorize?session_id=...` 진입 직후 `sessionStorage`에 저장하고 visible URL을 `/cli/authorize`로 replace합니다.
- GitHub OAuth `next`는 raw `session_id` 없이 `/cli/authorize`만 사용합니다.
- Backend OAuth next allowlist도 `/cli/authorize` query를 비워 직접 API 호출 경로의 session id 보존을 막습니다.
- 승인/만료/소비 terminal state에서는 stored session id를 삭제합니다.
- Pending 세션은 Backend `poll_interval_seconds`를 bounded delay로 사용해 자동 재확인합니다.

검증: [[Commercial Readiness Hardening - CLI Auth URL Minimization and Production DB TLS 2026-06-01#검증 증거]]

## 2026-06-01 Auth cookie teardown security tuple parity

> [!success]
> GitHub OAuth state cookie와 browser session cookie 삭제가 발급 시 보안 속성과 같은 tuple을 사용하도록 정렬했습니다.

계약:

- Browser auth cookie option은 `_browser_auth_cookie_options()`로 공유합니다.
- Production에서는 set/delete 모두 `HttpOnly`, `Secure`, `SameSite=lax`, `path=/`를 유지합니다.
- Logout과 OAuth callback cleanup은 path-only deletion으로 회귀하지 않습니다.

검증: [[Commercial Readiness Hardening - Settings Review Cookie and Command Wrapper Safety 2026-06-01#검증 증거]]

## 2026-06-01 Backend OAuth next allowlist

> [!success]
> GitHub OAuth `next` 값은 Backend 직접 호출 경로에서도 signed state에 들어가기 전에 in-app allowlist, query-key allowlist, safe hash policy를 통과해야 합니다.

계약:

- `/cli/authorize` path는 CLI browser-login return path로 보존하지만 `session_id` query는 OAuth state에 넣기 전에 제거합니다.
- Unknown route, protocol-relative path, backslash/encoded separator, dot segment, whitespace/control, scheme-like path는 `/dashboard`로 대체합니다.
- OAuth-sensitive query/hash(`token`, `code`, `state`, `access_token` 등)는 제거합니다.
- Frontend `authNextPath()`와 Backend `_safe_next_path()`는 같은 방향의 allowlist 정책을 유지해야 합니다.

검증: [[Commercial Readiness Hardening - Backend OAuth Next and Frontend Empty OK Responses 2026-06-01#검증 증거]]


## 2026-06-01 Backend rate-limit store fail-closed degraded mode

> [!success]
> Shared database rate-limit store 장애 시 process-local memory bucket으로 downgrade하지 않고 `RATE_LIMIT_STORE_UNAVAILABLE` degraded response로 fail-closed 처리합니다.

계약:

- Store unavailable은 `503 RATE_LIMIT_STORE_UNAVAILABLE` + `Retry-After`로 응답합니다.
- 정상 quota 초과는 기존 `429 RATE_LIMITED` 계약을 유지합니다.
- Degraded response도 `X-Request-ID`를 유지해 운영 trace가 가능합니다.
- Error log는 `bucket_name`, `rate_limit_degraded=True`, stack trace만 남기며 token/raw identity를 남기지 않습니다.

검증: [[Commercial Readiness Hardening - Backend Rate Limit Store Fail Closed 2026-06-01#검증 증거]]

## 2026-05-31 Browser-approved ingestion token rotation

> [!success]
> A bearer ingestion token can no longer mint a fresh replacement token by itself. Rotation now requires browser-approved CLI auth or Settings session auth.

계약:

- `POST /v1/ingest/token/rotate` returns `INGESTION_TOKEN_ROTATION_REQUIRES_SESSION` and never returns a raw replacement token.
- The route is deprecated in OpenAPI and does not advertise a raw-token success response model.
- `agentfeed rotate` verifies the saved token id through `/ingest/status`, then starts CLI browser auth with `replace_token_id`.
- Browser-approved exchange revokes the previous token and returns the replacement raw token exactly once.
- If the previous token cannot be verified, CLI still uses browser approval to issue a replacement but warns that stale tokens should be revoked in Settings.
- `AGENTFEED_TOKEN` remains externally managed; CLI does not rewrite environment variables or print browser-issued raw tokens.

검증:

- Backend full tests: 206 passed
- CLI full tests: 247 passed
- Frontend Settings contracts/build passed
- `agentfeed-dev make smoke-e2e` validates self-rotation 403, browser-approved replacement, old-token invalidation, upload/review/publish/feed.

관련 작업 노트: [[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]]

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

## 2026-05-30 Ingestion token lifecycle status

> [!success]
> Ingestion token expiry 정책이 CLI와 Frontend에 보이는 lifecycle metadata 계약으로 확장되었습니다.

계약:

- `GET /v1/ingest/status`는 인증된 `af_live_...` token의 `id`, `name`, `created_at`, `last_used_at`, `expires_at`, `expires_in_seconds`, `expiring_soon`을 반환합니다.
- `POST /v1/auth/cli/sessions/{id}/exchange`는 one-time raw token과 함께 `token_expires_at`을 반환합니다.
- status/list/revoke response는 raw token secret을 포함하지 않습니다.
- `/v1/me/ingestion-tokens` create/list/delete는 response model로 계약을 고정합니다.

관련 구현: [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]

## 2026-05-30 Ingestion token rotation contract

> [!success]
> Ingestion token expiry warning의 remediation path를 `login` 재발급이 아니라 first-class rotation으로 승격했습니다.

계약:

- `POST /v1/ingest/token/rotate`는 현재 bearer `af_live_...` token을 revoke하고 replacement raw token을 한 번만 반환합니다.
- `POST /v1/me/ingestion-tokens/{token_id}/rotate`는 signed-in Settings 관리자가 특정 active token을 rotate합니다.
- Rotation response에는 `token`, `token_expires_at`, `rotated_from`, `rotated_at`이 포함되지만 list/status response에는 raw token이 없습니다.
- Rotation은 quota-at-limit 상태에서도 동작하도록 old token revoke와 new token issue를 같은 transaction 경계에서 처리합니다.
- 두 rotate mutation은 critical mutation rate-limit bucket에 포함됩니다.

관련 구현: [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]]

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
- [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]
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
- CLI authorize page는 2026-06-01 이후 raw `session_id`를 OAuth `next`에 넣지 않고 `/cli/authorize` path만 보존합니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Header OAuth next preservation]]

## 2026-05-30 Frontend OAuth next allowlist

> [!success]
> Browser login redirect target은 명시적으로 허용한 AgentFeed route만 유지합니다.

보안 계약:

- 허용 route는 `/`, `/feed`, `/explore`, `/leaderboard`, `/projects`, `/search`, `/dashboard`, `/notifications`, `/docs`, `/privacy`, `/terms`, `/changelog`, `/cli/authorize`와 public dynamic prefix(`/profile/`, `/projects/`, `/worklog/`, `/worklogs/`)입니다.
- protocol-relative URL, absolute URL, `javascript:` 같은 scheme-like 값, encoded `//`, encoded/raw backslash, whitespace/control char, `.`/`..` segment는 거부합니다.
- unsafe next는 query를 보존하지 않고 `/`로 fallback합니다.
- `auth.githubUrl(next)` 직접 호출도 unsafe next를 OAuth query param에 싣지 않습니다.
- CLI authorize return path는 `/cli/authorize`만 OAuth `next`에 보존하고, one-time `session_id`는 최초 진입 후 `sessionStorage`에만 둡니다.

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

## 2026-05-30 Cookie-authenticated mutation Origin gate

> [!success]
> Browser cookie 인증 mutation은 이제 trusted frontend Origin/Referer에서 온 요청만 통과합니다.

계약:

- `access_token` cookie가 있는 unsafe method request는 `FRONTEND_URL` 또는 `ALLOWED_ORIGINS` origin과 일치해야 합니다.
- `GET`, `HEAD`, `OPTIONS`는 safe method로 gate를 우회합니다.
- Cookie가 없는 bearer-only CLI request는 Origin header 없이 계속 통과합니다.
- 실패 응답은 `CSRF_ORIGIN_INVALID` 403으로 고정합니다.

검증: [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30#검증 결과]]

## 2026-05-30 One-time rotated token capture UX

> [!success]
> Settings rotation secret은 copy-first, masked-by-default, auto-clear UX로 다룹니다.

계약:

- Raw token은 기본적으로 DOM에 평문 노출하지 않고 masked text로 표시합니다.
- Clipboard copy 성공/실패 상태를 명시하고, 실패 시 수동 reveal fallback을 제공합니다.
- Panel은 120초 후 자동 clear되며 dismiss 전에는 다른 token mutation을 막습니다.
- Secret은 localStorage/sessionStorage/API cache에 저장하지 않습니다.

관련 구현: [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30]]

## 2026-05-31 CLI repo-local API trust gate

> [!success]
> 인증 token이 있는 CLI request는 repo-local `.env` API base를 기본 신뢰하지 않습니다.

계약:

- `AGENTFEED_API_BASE_URL` explicit env와 saved credential API base는 계속 신뢰합니다.
- `.env` / `BACKEND_PORT` discovery는 token이 없을 때 dev convenience로만 사용합니다.
- token이 있는 상태에서 repo-local API base를 쓰려면 `AGENTFEED_TRUST_REPO_API_BASE=1`이 필요합니다.
- trust gate warning은 source detail을 포함하되 token 값은 노출하지 않습니다.

관련 구현: [[Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31]]

## 2026-05-31 Browser login opener timeout

> [!success]
> CLI browser login은 opener 실행 전에 authorize URL을 먼저 출력하고, opener process가 닫히지 않는 환경에서도 timeout 후 수동-open 안내를 제공합니다.

- `openBrowser()`는 child process를 unref하되 timeout timer로 최대 대기 시간을 제한합니다.
- `agentfeed login`/`rotate --browser`의 핵심 복구 경로는 “명령을 유지하고 URL을 브라우저에 붙여넣기”입니다.
- 검증: `npm test -- --run tests/open-browser.test.ts tests/cli-share.test.ts`, `npm run typecheck && npm test -- --run`

관련: [[Commercial Readiness Hardening - Browser Login API Bounds and Security Headers 2026-05-31]]

## 2026-05-31 Pre-auth API trust boundary and hook isolation

- `agentfeed login` / browser rotate는 pre-auth API base resolution에서 repo-local `.env` discovery를 기본 신뢰하지 않는다.
- Trust precedence는 explicit `--api-base-url` / `AGENTFEED_API_BASE_URL` / stored credentials / default이며, repo-local discovery는 `AGENTFEED_TRUST_REPO_API_BASE=1`일 때만 사용한다.
- Claude Code Stop hook은 AgentFeed collection 실패를 `.agentfeed/logs/hook.log`에 남기지만 사용자의 Claude session을 block하지 않도록 항상 exit `0`으로 종료한다.

## 2026-05-31 Auth response validation and CI browser guard

- CLI browser auth exchange와 ingestion token rotation response는 credential 저장 전에 token/date/user shape를 검증한다.
- malformed 200 response는 `API_RESPONSE_INVALID`로 실패하며 기존 credentials를 유지한다.
- `AGENTFEED_CI=1`에서는 browser login을 기본 차단하고 token-based login을 안내한다. 명시적 interactive override는 `--browser`다.
## 2026-05-31 Native macOS keychain smoke

> [!success]
> CLI keychain storage는 injected unit test뿐 아니라 opt-in native macOS `security` round-trip smoke로도 검증되었습니다.

계약:

- 기본 test suite는 사용자 keychain을 건드리지 않습니다.
- `AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS=1`인 macOS local 환경에서만 native smoke가 실행됩니다.
- Smoke token은 dummy fixture이며 `credentials.json`에는 저장되지 않습니다.
- 테스트 후 `security delete-generic-password`로 smoke credential을 삭제합니다.

검증: [[Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31#검증 증거]]


## 2026-05-31 CLI token stdin login

> [!success]
> 이미 발급된 ingestion token을 CLI에 연결할 때 raw secret이 shell history/process argv에 남지 않도록 stdin-first login 경로를 추가했습니다.

계약:

- 기본 `agentfeed login`은 browser approval flow를 유지합니다.
- 이미 token을 가진 사용자는 `printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin` 또는 `agentfeed login --token -`로 stdin 입력을 사용할 수 있습니다.
- stdin token은 credential 저장 또는 `--no-save` ephemeral 경로에 모두 사용할 수 있습니다.
- stdout/stderr에는 raw token을 출력하지 않습니다.
- CI browser-login guard와 missing-token remediation은 `--token-stdin`을 우선 안내합니다.
- `agentfeed login --token <token>`은 backward-compatible dev escape hatch로 남기지만 권장 경로는 아닙니다.

검증: [[Commercial Readiness Hardening - CLI Token Stdin Login 2026-05-31#검증 증거]]

## 2026-05-31 CLI auth smoke and CI guard

> [!success]
> Browser login UX와 CI guard는 real GitHub credential 없이도 local fake auth server로 회귀 검증됩니다.

계약:

- `agentfeed login --no-open --no-save`는 authorize URL과 대기 UX 문구를 출력하되 raw token을 stdout에 노출하지 않습니다.
- `--no-save` browser login은 exchange 성공 후에도 `credentials.json`을 만들지 않습니다.
- CI env에서는 browser session API 요청을 만들기 전에 fail-fast하고 `AGENTFEED_TOKEN` 또는 `agentfeed login --token-stdin` remediation을 안내합니다.
- 의도적으로 CI에서 browser auth를 실행하려면 `--browser` override가 필요합니다.

검증: [[Commercial Readiness Hardening - Concurrent Notification Migration CLI Auth Smoke and Header Contracts 2026-05-31#검증 증거]]


## 2026-05-31 Cross-platform browser opener and open command trust

> [!success]
> CLI browser/review open flow가 Windows, WSL, macOS, Linux opener contract를 분리하고 cached review URL trust boundary를 회귀 테스트로 고정했습니다.

계약:

- Windows는 `cmd /c start "" <url>`을 사용합니다.
- WSL은 `wslview`, macOS는 `open`, Linux는 `xdg-open`을 사용합니다.
- `agentfeed open`은 cached `review_url`이 trusted AgentFeed host 또는 configured local/custom API base와 맞을 때만 browser opener를 호출합니다.
- `agentfeed open --latest`와 `agentfeed open --id <draft_id>`는 help/README에 노출됩니다.

검증: [[Commercial Readiness Hardening - Cross Platform Open Config Validation and Settings Partial Failure 2026-05-31#검증 증거]]


## 2026-05-31 OAuth next hash preservation

> [!success]
> GitHub OAuth sign-in redirect가 safe hash fragment를 보존하면서 token/code/state leakage hash는 fail-closed로 제거합니다.

계약:

- `authNextPath('/search', 'q=codex', '#results')`는 `/search?q=codex#results`를 반환합니다.
- pathname에 inline hash가 있어도 safe hash는 보존됩니다.
- `javascript:`, `//evil`, control char, `access_token`, `id_token`, `token`, `oauth_token`, `oauth_verifier`, `code`, `state`가 포함된 hash는 제거됩니다.
- Header sign-in button과 AppContext forced sign-in redirect가 모두 `window.location.hash`를 반영합니다.

검증: [[Commercial Readiness Hardening - Feed Keyset and OAuth Hash Redirect 2026-05-31#검증 증거]]

## 2026-05-31 CLI auth exchange live smoke token path

> [!success]
> Dev smoke가 seed token 대신 CLI auth session exchange로 발급된 ingestion token을 사용해 upload를 수행합니다.

계약:

- `/v1/auth/cli/sessions` 응답의 `authorize_url`은 최초 browser deep link로만 `/cli/authorize?session_id=...`를 포함하며, OAuth `next` state에는 이 query를 보존하지 않습니다.
- Browser 승인 API는 authenticated access token으로 session을 approved 상태로 전환합니다.
- Exchange API는 verifier를 확인한 뒤 `af_live_...` ingestion token을 한 번만 반환합니다.
- Smoke는 반환된 token으로 `/v1/ingest/status`와 CLI `share --json` upload를 실행합니다.

검증: [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31#검증 증거]]

## 2026-05-31 Literal argv token guard

> [!success]
> Raw ingestion token이 shell history/process argv/support screenshot에 남지 않도록 literal `agentfeed login --token <token>`을 기본 비활성화했습니다.

계약:

- 기본 login은 browser approval flow입니다.
- 이미 token을 가진 사용자는 `--token-stdin` 또는 `--token -`로 stdin을 사용합니다.
- CLI help와 README는 literal argv token login을 권장 예시에서 제거합니다.
- local throwaway dev escape hatch는 `AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1`이 있을 때만 동작합니다.

검증: [[Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31#검증 증거]]

## 2026-05-31 Public and ingest IP-based rate-limit identity

> [!success]
> Rate limit middleware가 auth보다 먼저 실행되는 경로에서 random Bearer header가 IP throttle을 우회하지 못하도록 보정했습니다.

계약:

- Public/bootstrap/ingest route는 Bearer header 유무와 무관하게 IP/network-origin identity로 bucket을 잡습니다.
- Private authenticated route는 기존 token/cookie identity를 유지합니다.
- Trusted proxy forwarding 처리는 기존 `_request_ip_identity` 경로를 공유합니다.

검증: [[Commercial Readiness Hardening - Rate Limit and Privacy Finding Ownership 2026-05-31#검증 증거]]

## 2026-05-31 OAuth browser session cookie path

> [!success]
> GitHub OAuth callback에서 발급하는 browser `access_token` cookie와 OAuth state cookie의 path scope를 `/`로 고정했습니다.

계약:

- `/v1/auth/github` state cookie는 `Path=/`로 발급됩니다.
- `/v1/auth/github/callback` access token cookie는 `Path=/`로 발급되어 `/v1/me` 등 API route에서 누락되지 않습니다.
- callback success와 logout은 같은 path로 cookie를 삭제합니다.

검증: [[Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31#검증 증거]]

## 2026-05-31 Keychain auto fallback warning provenance

> [!success]
> `AGENTFEED_CREDENTIAL_STORE=auto`가 OS keychain을 사용할 수 없을 때 private credentials file fallback 사실을 저장/출력합니다.

계약:

- explicit `file` 저장은 warning 없이 의도된 file storage로 남습니다.
- explicit `keychain` 저장은 keychain unavailable/write failure에서 계속 실패합니다.
- `auto` fallback은 `credential_store_warning` metadata를 저장하고 `login`/`status`/`doctor`에서 warning으로 노출합니다.

검증: [[Commercial Readiness Hardening - Rate Limit Fallback Detail Payload Resilience and Credential Fallback Warning 2026-05-31#검증 증거]]


## 2026-05-31 Auth identity normalization boundary

> [!success]
> Frontend `currentUser`는 이제 raw `/auth/me` payload가 아니라 정규화된 `ApiAuthMe` 또는 `null`만 받습니다.

계약:

- `normalizeAuthMe()`는 `id` 또는 `username`이 usable string인 payload만 통과시킵니다.
- `display_name`은 `display_name → username → id` 순서로 fallback합니다.
- profile URL, `location`, timezone은 string/null로 제한합니다.
- malformed successful identity payload는 signed-in state가 아니라 signed-out state로 처리합니다.
- CLI authorization page도 `auth.me()`가 `null`을 반환하면 GitHub sign-in flow로 유도합니다.

검증: [[Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31#검증 증거]]


## 2026-06-01 Keychain auto fallback fail-closed

> [!success]
> `AGENTFEED_CREDENTIAL_STORE=auto`는 keychain unavailable/write failure에서 명시적 break-glass opt-in 없이 file token storage로 fallback하지 않습니다.

계약:

- `auto` + keychain unavailable/write failure + no `AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1` → credentials file 미생성, 명확한 error.
- `AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1` → fallback 허용 + `credential_store_warning` 저장.
- `AGENTFEED_CREDENTIAL_STORE=file` → 의도적 local file storage로 계속 지원.
- `AGENTFEED_CREDENTIAL_STORE=keychain` → 기존처럼 keychain unavailable/write failure에서 실패.

검증: [[Commercial Readiness Hardening - CLI Credential Fallback Fail Closed 2026-06-01#검증 증거]]

## 2026-06-01 GitHub OAuth outbound timeout

> [!success]
> GitHub OAuth provider 호출이 bounded timeout을 갖고 timeout 실패를 controlled 503으로 변환합니다.

계약:

- token exchange와 GitHub user fetch는 같은 `GITHUB_OAUTH_TIMEOUT`을 사용합니다.
- connect/read timeout은 `GITHUB_OAUTH_UNAVAILABLE` 503으로 응답됩니다.
- OAuth callback/login worker가 provider network stall에 무기한 묶이지 않아야 합니다.

검증: [[Commercial Readiness Hardening - Test Metrics Activity Range OAuth Timeout and Notification Feedback 2026-06-01#검증 증거]]
