---
title: Runtime Configuration
tags:
  - agentfeed/config
  - agentfeed/frontend
  - agentfeed/integration
aliases:
  - AgentFeed Runtime Config
  - Frontend API URL Safety
status: active
created: 2026-05-30
---

# Runtime Configuration

> [!abstract] 목적
> CLI, Backend, Frontend가 같은 API endpoint 계약을 바라보도록 runtime URL과 환경변수를 검증·정규화합니다.

## 2026-05-30 Frontend API URL normalization

> [!success]
> Frontend `NEXT_PUBLIC_API_URL`이 `/v1`을 포함하거나 trailing slash를 포함해도 `/v1/v1` endpoint를 만들지 않도록 정규화했습니다.

### 계약

- Frontend env의 의미는 **Backend API root**입니다.
- 실수로 `http://localhost:8001/v1/`처럼 CLI용 API base URL을 넣어도 root `http://localhost:8001`로 정규화합니다.
- `buildApiUrl('/feed', root)`는 항상 `${root}/v1/feed` 형식으로 만듭니다.
- `ftp://`, query/hash, URL credential 포함 값은 fetch 전에 실패합니다.
- GitHub OAuth 시작 URL도 같은 `buildApiUrl('/auth/github')` helper를 사용해 endpoint 중복을 피합니다.

### 검증

- RED: `npx tsc --noEmit --pretty false`가 `buildApiUrl` / `normalizeApiRoot` export 부재로 실패
- GREEN:
  - `npm run test:contracts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`
  - `agentfeed-dev/scripts/test-all.sh`에 Frontend `npm run test:contracts`를 추가

> [!note]
> CLI는 `/v1` 포함 API base URL을 사용하고, Frontend는 API root를 사용하는 게 원칙입니다. 다만 현업 설정 실수를 흡수하기 위해 Frontend도 최종 `/v1` suffix는 root로 정규화합니다.

## 2026-05-30 Frontend production API env preflight

> [!success]
> Frontend production build는 `NEXT_PUBLIC_API_URL`이 없을 때 더 이상 localhost API root로 조용히 빌드되지 않고, 명시적인 preflight 오류로 중단됩니다.

### 계약

- `npm run build`는 `scripts/check-env.mjs`를 먼저 실행합니다.
- `NEXT_PUBLIC_API_URL`은 production build에서 필수입니다.
- 값은 `http`/`https` URL이어야 하며 hostname이 필요합니다.
- URL credential, query, hash fragment는 금지합니다.
- app module import 단계에서는 API root를 lazy resolution하므로, env 누락 오류는 Next prerender stack trace가 아니라 preflight 메시지로 드러납니다.
- local/dev stack과 CI gate는 명시적으로 `NEXT_PUBLIC_API_URL=http://localhost:8000` 또는 `.env` 값을 전달합니다.

### 검증

- RED: `normalizeApiRoot(undefined, { nodeEnv: 'production' })` 계약 테스트가 기존 함수 signature에서 실패
- GREEN:
  - `npm run test:contracts`
  - `npx tsc --noEmit --pretty false`
  - `env NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`
  - `env -u NEXT_PUBLIC_API_URL npm run build`가 `NEXT_PUBLIC_API_URL is required`로 실패하는지 확인
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!important]
> 실제 배포 환경에서는 `NEXT_PUBLIC_API_URL=https://<backend-api-root>`를 설정해야 합니다. Frontend env의 의미는 `/v1`을 제외한 API root입니다.

## 2026-05-30 CLI API POST timeout

> [!success]
> CLI `login`, `preview`, `publish`, `share --upload`에서 사용하는 POST 요청도 bounded timeout과 `AbortSignal`을 갖도록 보강했습니다.

### 계약

- `createCliAuthSession()` / `exchangeCliAuthSession()`은 fetch에 `AbortSignal`을 전달합니다.
- ingest preview/upload 요청도 fetch에 `AbortSignal`을 전달합니다.
- 기본 timeout은 30초입니다.
- `AGENTFEED_API_TIMEOUT_MS` 환경변수로 CLI API request timeout을 조정할 수 있습니다.
- upload timeout은 `API_REQUEST_TIMEOUT`으로 실패하고 local draft는 uploaded 상태로 표시하지 않습니다.
- timeout 외 네트워크 실패도 `API_REQUEST_FAILED`로 감싸 사용자에게 API 연결 문제를 명확히 전달합니다.

### 검증

- RED: `npx vitest run tests/api-hook.test.ts --testNamePattern "creates and exchanges|times out"`가 POST fetch signal 누락과 timeout 미처리로 실패
- GREEN:
  - `npx vitest run tests/api-hook.test.ts --testNamePattern "creates and exchanges|times out"`
  - `npm test -- --run`
  - `npm run typecheck`
  - `npm run build`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!note]
> health/token preflight는 기존 3초 timeout을 유지하고, 실제 POST 요청은 기본 30초 timeout을 사용합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 Frontend API URL normalization]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend production API env preflight]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI API POST timeout]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI API base URL validation]]
- [[Active Tasks#P1 후보]]

## 2026-05-30 Runtime API config failure UI

> [!success]
> 런타임 API URL 설정 오류가 signed-out 상태나 click crash로 숨지 않고 전역 banner로 노출됩니다.

계약:

- `getApiConfigError()`는 `normalizeApiRoot()`의 validation 결과를 UI에서 표시 가능한 문자열로 변환합니다.
- `AppProvider`는 API config 오류가 있으면 `/auth/me` probing을 하지 않고 `signedIn=false`, `isLoading=false`로 안정화합니다.
- 전역 banner는 `role="alert"`로 렌더되고 `NEXT_PUBLIC_API_URL` 설정 방법과 구체 오류 메시지를 표시합니다.
- Header OAuth buttons는 API config 오류가 있으면 disabled 처리하고 오류 메시지를 title로 제공합니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --incremental false`
- `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`
- `scripts/check-env.mjs` negative smoke에서 unset/invalid protocol/credential/query-hash가 모두 exit 1로 실패

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 Frontend OAuth next allowlist + runtime API config UI]]

## 2026-05-30 Frontend production HTTPS API gate

> [!success]
> Production frontend는 non-local API URL을 HTTP로 빌드/실행하지 않도록 차단합니다.

계약:

- `NEXT_PUBLIC_API_URL=http://api.agentfeed.dev` 같은 non-local HTTP URL은 production/runtime validation에서 실패합니다.
- `http://localhost:*`, `http://127.0.0.1:*`는 local/dev smoke를 위해 허용합니다.
- user-facing `ApiError.message`는 backend raw body를 그대로 노출하지 않고 status/category 기반 safe message를 사용합니다.
- raw response body는 `diagnosticBody` / `body`에만 보존합니다.
- frontend lint gate는 interactive `next lint` 대신 `tsc --noEmit`으로 deterministic하게 동작합니다.

검증:

- `npm run test:contracts && npm run lint`
- `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`

관련: [[Commercial Readiness Audit 2026-05-30#Frontend user-facing safety / runtime config]]

## 2026-05-30 Frontend PostCSS advisory override

> [!success]
> Next stable이 아직 vulnerable PostCSS를 pin하는 동안, npm targeted `overrides.next.postcss`로 PostCSS patch version을 고정해 production dependency audit를 clean하게 유지합니다.

계약:

- `next@15.5.18`은 transitive `postcss`를 `8.4.31`로 pin하고, npm audit은 `GHSA-qx2v-qp2m-jg93` moderate advisory를 보고했습니다.
- stable `next@16.2.6`도 현재 `postcss 8.4.31`을 사용하므로 canary upgrade 대신 `overrides.next.postcss=8.5.15`를 적용합니다.
- npm tree는 `next -> postcss@8.5.15 overridden`이어야 합니다.
- `agentfeed-dev/scripts/test-all.sh`는 CLI/Frontend production dependency audit gate를 실행해 lockfile drift를 잡습니다.
- Next stable이 `postcss >= 8.5.10`을 직접 포함하면 override 제거 가능성을 재평가합니다.

검증:

- `npm ls postcss next --all` → `next -> postcss@8.5.15 overridden`
- `npm audit --omit=dev --audit-level=moderate` → found 0 vulnerabilities
- `npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`

관련: [[Commercial Readiness Audit 2026-05-30#아직 남은 P1 후보]]


## 2026-05-30 Backend RATE_LIMIT_STORE

> [!success]
> Backend rate-limit store selection is environment-aware: local은 memory, production-like는 Postgres database store입니다.

계약:

- `RATE_LIMIT_STORE=auto`가 기본값입니다.
- `ENVIRONMENT=development|dev|local`에서는 `auto -> memory`입니다.
- 그 외 env에서는 `auto -> database`입니다.
- `RATE_LIMIT_STORE=memory`는 non-development에서 fail-closed validation error입니다.
- database store는 기존 `DATABASE_URL` Postgres를 사용하므로 Redis 신규 의존성을 추가하지 않습니다.
- migration `006_rate_limit_events`가 적용되어야 production limiter가 동작합니다.

검증:

- `Settings(_env_file=None).rate_limit_store == "memory"`
- production settings의 `rate_limit_store == "database"`
- production `RATE_LIMIT_STORE=memory`는 `ValueError`
- `uv run --no-sync --python 3.12 alembic upgrade head --sql`

관련: [[Auth & Credential Safety#2026-05-30 Shared database rate-limit store]]


## 2026-05-30 Production API docs exposure gate

> [!success]
> Production mode에서는 FastAPI schema/docs endpoints를 공개하지 않습니다.

계약:

- `settings.is_production`이 true이면 `docs_url`, `redoc_url`, `openapi_url`이 모두 `None`입니다.
- development/local mode에서는 `/docs`, `/redoc`, `/openapi.json`을 유지해 로컬 개발 편의성을 보존합니다.
- JWT `sub` malformed value는 authenticated user로 처리하지 않고 anonymous로 degrade합니다.

관련 구현: [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]


## 2026-05-30 Frontend theme hydration bootstrap

> [!success]
> Theme preference를 hydration 전에 `<html data-theme>`에 반영해 hard refresh/light theme mismatch window를 줄였습니다.

계약:

- `agentfeed-theme` localStorage key가 theme preference의 browser-local source입니다.
- SSR fallback은 dark이지만, head bootstrap script가 hydration 전에 persisted `dark|light` 값을 적용합니다.
- AppProvider는 DOM/localStorage에서 initial theme을 읽고, state change를 DOM + localStorage에 동기화합니다.
- `<html suppressHydrationWarning>`으로 bootstrap이 바꾼 `data-theme` attribute mismatch warning을 방지합니다.

관련 구현: [[Commercial Readiness Hardening - Comment Capability and Theme Hydration 2026-05-30]]

## 2026-05-30 CLI credential and API source provenance

> [!success]
> `agentfeed status`와 `agentfeed doctor`가 credential token source, credential file path, API base URL source, unsafe `.env` warning을 표시합니다.

계약:

- API base precedence는 explicit option → environment → saved credentials → repo `.env` → default입니다.
- repo `.env`의 `AGENTFEED_API_BASE_URL`은 loopback dev URL만 auto-discovery 대상으로 허용합니다.
- non-loopback `.env` 값은 무시하고 default fallback을 쓰되 warning을 출력합니다.
- token source는 `environment`, `credentials_file`, `missing` 중 하나로 설명합니다.
- raw token 값은 status/doctor에 출력하지 않습니다.

검증:

- `npm run build && npm test -- --run tests/config.test.ts tests/cli-status-doctor.test.ts && npm run typecheck`
- `npm test -- --run`
- `npm pack --dry-run`
- `npm audit --omit=dev --audit-level=moderate`
- `../agentfeed-dev/scripts/test-all.sh`
- `../agentfeed-dev/scripts/smoke-e2e.sh`

관련 구현: [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]

## 2026-05-30 CLI token expiry visibility

> [!success]
> CLI는 저장 credential과 remote token status를 구분해 token expiry를 설명합니다.

계약:

- browser login으로 받은 `token_expires_at`은 저장 credential에 보존합니다.
- `AGENTFEED_TOKEN` 환경변수 token은 저장 파일의 expiry를 상속하지 않습니다.
- `agentfeed status`는 local saved expiry만 표시하므로 network call 없이 빠르게 동작합니다.
- `agentfeed doctor`는 `/v1/ingest/status` remote metadata를 우선해 실제 서버 기준 만료/임박 경고를 표시합니다.
- raw token은 status/doctor/login output에 출력하지 않습니다.

검증:

- `npm run build && npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts tests/config.test.ts && npm run typecheck`
- `../agentfeed-dev/scripts/test-all.sh`

관련 구현: [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]

## 2026-05-30 CLI token rotation command

> [!success]
> `agentfeed status` / `agentfeed doctor`의 expiry warning은 이제 사용자가 바로 실행할 수 있는 `agentfeed rotate` remediation을 안내합니다.

계약:

- `agentfeed rotate`는 saved credential token을 `/v1/ingest/token/rotate`로 교체하고 새 raw token은 credential file에만 저장합니다.
- stdout에는 `rotated_from`, replacement token id, API URL, expiry만 출력하고 raw secret은 출력하지 않습니다.
- saved token이 invalid/expired이면 browser login replacement flow로 fallback합니다.
- `AGENTFEED_TOKEN` 환경변수 source는 in-place 저장 대상이 아니므로 unset 또는 `agentfeed rotate --browser`를 안내합니다.
- `agentfeed token rotate`는 같은 동작의 alias입니다.

검증: [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30#검증 결과]]

## 2026-05-30 CLI invalid token recovery hint

> [!success]
> Upload/preview/publish에서 token invalid 오류가 나면 `agentfeed rotate` 중심의 복구 경로를 안내합니다.

계약:

- 401 또는 `INGESTION_TOKEN_INVALID`는 `agentfeed rotate`를 우선 remediation으로 표시합니다.
- `AGENTFEED_TOKEN` 환경변수 source는 CLI가 저장 파일처럼 교체할 수 없으므로 env 값을 직접 교체하거나 `agentfeed rotate --browser`를 사용하도록 안내합니다.
- 기존 token raw value는 error message에 포함하지 않습니다.

검증: [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30#검증 결과]]

## 2026-05-30 Environment token rotation remediation

> [!success]
> `AGENTFEED_TOKEN` source에서 `agentfeed rotate`를 실행할 때 env var를 in-place로 수정할 수 없다는 점과 안전한 다음 행동을 명확히 안내합니다.

계약:

- CLI는 raw token을 stdout/stderr에 출력하지 않습니다.
- Saved credential token은 `agentfeed rotate`로 API rotate 후 credential file에 저장합니다.
- `AGENTFEED_TOKEN` source는 AgentFeed Settings 또는 secret manager에서 새 token을 발급/rotate한 뒤 shell/secret manager 값을 교체합니다.
- saved credential flow로 전환하려면 `unset AGENTFEED_TOKEN && agentfeed rotate --browser`를 사용합니다.

검증: [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30#검증 결과]]

관련 구현: [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30]]


## 2026-05-31 Public discovery rate-limit contract

> [!success]
> Public read/discovery API도 mutation API와 별도 read-tier bucket으로 보호합니다.

계약:

- `/v1/search`, `/v1/search/suggestions`, `/v1/feed`, `/v1/leaderboard`, `/v1/explore`, `/v1/tags`, project/user/worklog public read paths는 rate-limit rule을 갖습니다.
- users/explore category dynamic segments는 shared bucket으로 normalize합니다.
- search query는 trim 후 2~120자 범위만 허용합니다.

관련 구현: [[Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31]]
