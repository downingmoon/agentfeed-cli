---
title: Integration - CLI Backend Frontend
aliases:
  - AgentFeed 3 Repo Integration
  - Cross Repo Integration
tags:
  - agentfeed/integration
  - agentfeed/cli
status: active
created: 2026-05-30
---

# Integration - CLI Backend Frontend

## End-to-end 흐름

```mermaid
sequenceDiagram
    participant CLI
    participant API as Backend API
    participant FE as Frontend
    CLI->>CLI: collect/share draft 생성
    CLI->>API: POST /v1/ingest/worklogs
    API-->>CLI: review_url
    CLI->>FE: /worklogs/{id}/review 열기
    FE->>API: GET /v1/worklogs/{id}/review
    FE->>API: resolve privacy findings / publish
    FE->>API: feed/profile/project 조회
```

## 계약 기준

> [!important]
> 파라미터 충돌이 있으면 **Database column name → Backend → Frontend → CLI** 순서로 맞춥니다.

## 완료된 큰 축

- review URL route 정합성
- OAuth callback/dashboard route 정합성
- ingest source metadata 보존
- duplicate ingest idempotency
- feed/project/leaderboard/social API mock 제거 및 실 API 연결
- collection window reason review evidence 노출
- review evidence에 `collection_quality` / `collection_sources` 노출
- Linux review URL clipboard fallback 보강
- `share --note`를 `summary` prefix가 아닌 `user_note` 별도 계약으로 승격

## 2026-05-30 Landing placeholder control 제거

> [!success]
> Landing page의 public footer placeholder links와 hero sample card의 inert comment/share controls를 실제 route/action으로 연결했습니다.

수정:

- Landing footer `href="#"` 링크를 `/changelog`, `/privacy`, `/terms`, `/docs`, GitHub URL로 교체했습니다.
- 샘플 worklog comment 버튼은 실제 detail route로 이동합니다.
- 샘플 share 버튼은 Web Share API를 사용하고, 미지원 환경에서는 clipboard copy로 fallback합니다.

검증:

- `npx tsc --noEmit --pretty false`
- `npm run build`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Frontend inert control 제거

> [!success]
> Header notification bell, feed sidebar follow/category buttons, footer placeholder links를 실제 route 또는 API-backed action으로 연결했습니다.

수정:

- Header 알림 버튼 → `/notifications` route 연결
- `/notifications` page 추가: `GET /v1/me/notifications`, 개별 read, all-read, pagination 사용
- Feed Rising builders follow 버튼 → `POST/DELETE /v1/users/{username}/follow` optimistic action 연결
- Feed Hot categories 버튼 → feed category filter 갱신
- Footer `href="#"` 제거 → `/changelog`, `/privacy`, `/terms`, `/docs`, GitHub link 연결
- Changelog/Privacy/Terms/Docs static route 추가

검증:

- `npx tsc --noEmit --pretty false`
- `npm run build`

> [!note]
> Frontend repo에는 아직 별도 test runner dependency가 없으므로, 새 dependency 추가 없이 TypeScript/Next build gate로 검증했습니다.

## 2026-05-30 Backend project_id UUID validation

> [!success]
> string으로 받던 `project_id` 입력을 schema/query validation 단계에서 UUID로 검증해 malformed ID가 router 내부 `uuid.UUID(...)` 변환으로 500을 만들지 않도록 보정했습니다.

문제:

- `POST /v1/worklogs` body의 `project_id`와 `GET /v1/me/worklogs?project_id=...` query는 문자열로 받은 뒤 router 내부에서 `uuid.UUID(...)`를 직접 호출했습니다.
- 잘못된 UUID가 들어오면 FastAPI/Pydantic의 표준 422가 아니라 route 실행 중 예외로 번질 수 있었습니다.

수정:

- `CreateWorklogRequest.project_id`를 `uuid.UUID | None`으로 변경했습니다.
- `get_my_worklogs.project_id` query type을 `uuid.UUID | None`으로 변경했습니다.
- router 내부 수동 UUID 변환을 제거하고 validation된 값을 그대로 사용합니다.

검증:

- invalid `CreateWorklogRequest.project_id` Pydantic validation 회귀 테스트
- `/me/worklogs` handler signature가 FastAPI UUID validation을 사용하는지 회귀 테스트
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/schemas/worklog.py app/routers/worklogs.py app/routers/me.py tests/test_contracts.py`

## 2026-05-30 CLI API base URL validation

> [!success]
> `agentfeed login/status/share` 등이 사용하는 API base URL을 네트워크 호출 전에 검증하고, trailing slash를 정규화하도록 보정했습니다.

문제:

- `AGENTFEED_API_BASE_URL`, `.env`, 저장 credential, 명시 옵션에서 들어온 URL이 malformed이거나 `ftp://` 같은 잘못된 protocol이어도 그대로 fetch 시점까지 전달될 수 있었습니다.
- 사용자는 `fetch failed` 같은 늦은 오류만 보게 되어 로컬 연결 문제를 파악하기 어려웠습니다.

수정:

- `resolveApiBaseUrl()`이 최종 candidate를 `normalizeApiBaseUrl()`로 검증합니다.
- 허용 protocol은 `http` / `https`입니다.
- hostname 필수, URL 내 credentials 금지, query/hash 금지입니다.
- `/v1/` 같은 trailing slash는 `/v1`로 정규화합니다.

검증:

- malformed URL reject 회귀 테스트
- unsupported protocol reject 회귀 테스트
- query/hash reject 회귀 테스트
- env/file URL normalization 회귀 테스트
- `npx vitest run tests/config.test.ts`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`

## 2026-05-30 Backend production env fail-fast

> [!success]
> `ENVIRONMENT=production`일 때 Backend가 weak/default secret, localhost OAuth callback/frontend/origin, 누락된 GitHub OAuth 값을 조용히 받아들이지 않도록 fail-fast validation을 추가했습니다.

문제:

- 기존 Backend 설정은 production에서도 기본 `SECRET_KEY`, localhost `GITHUB_REDIRECT_URI`, localhost `FRONTEND_URL`, localhost `ALLOWED_ORIGINS`, 빈 GitHub OAuth 값을 그대로 허용할 수 있었습니다.
- 이 상태로 배포되면 로그인/OAuth flow가 깨지거나 JWT signing secret이 기본값으로 남는 운영 사고가 가능합니다.

수정:

- `Settings` model validation에서 production일 때 다음을 강제합니다.
  - `SECRET_KEY`: 기본값 금지, 최소 32자
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: non-empty
  - `GITHUB_REDIRECT_URI` / `FRONTEND_URL` / `ALLOWED_ORIGINS`: public `https` URL, localhost 금지
- development 기본값은 로컬 구동 편의성을 위해 유지합니다.

검증:

- production secure config accept 회귀 테스트
- default secret reject 회귀 테스트
- localhost OAuth/frontend/origin reject 회귀 테스트
- missing GitHub OAuth value reject 회귀 테스트
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/config.py tests/test_contracts.py`

## 2026-05-30 Backend provider token at-rest 보호

> [!success]
> Backend GitHub OAuth provider token은 신규 저장/갱신 시 `AuthAccount.access_token_encrypted` 컬럼에 `af1:` prefix가 붙은 encrypted value로 저장합니다.

문제:

- 컬럼명은 `access_token_encrypted`였지만 기존 구현은 GitHub provider token을 그대로 저장했습니다.
- DB snapshot 또는 관리자 실수로 provider token이 노출되면 GitHub OAuth 권한까지 노출될 수 있었습니다.

수정:

- `SECRET_KEY`에서 유도한 Fernet key로 provider token을 암호화합니다.
- 새 auth account 생성과 기존 account token refresh 모두 암호화 경로를 탑니다.
- 기존 plaintext row를 읽을 수 있도록 `af1:` prefix가 없는 값은 legacy plaintext로 취급하는 migration fallback을 유지합니다.

검증:

- provider token round-trip / plaintext 미포함 회귀 테스트
- legacy plaintext fallback 회귀 테스트
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/services/auth.py tests/test_contracts.py`

> [!warning] 운영 메모
> `SECRET_KEY`가 바뀌면 새 encrypted provider token 복호화가 불가능합니다. 운영에서는 secret rotation 전에 별도 provider-token migration/rotation 절차가 필요합니다.

## 2026-05-30 CLI ephemeral login --no-save

> [!success]
> CLI token/browser login에 credential file을 남기지 않는 `--no-save` 경로를 추가했습니다. 자세한 보안 계약은 [[Auth & Credential Safety#2026-05-30 CLI ephemeral login --no-save]]에 정리합니다.

계약:

- `agentfeed login --token <token> --no-save`는 API base URL만 검증/정규화하고 `~/.agentfeed/credentials.json`을 생성하지 않습니다.
- `agentfeed login --no-save` browser flow도 CLI auth exchange 후 credential을 저장하지 않습니다.
- 저장 로그인 경로는 기존처럼 credentials file을 만들고 `agentfeed status`에서 configured로 표시됩니다.
- `--no-save`는 token을 출력하지 않으며, 다음 명령에서 쓰려면 `AGENTFEED_TOKEN` 또는 저장 로그인을 사용해야 합니다.

검증:

- `npx vitest run tests/config.test.ts tests/api-hook.test.ts`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `../agentfeed-dev/scripts/test-all.sh`
- `HOME=$(mktemp -d) node dist/cli/index.js login --token af_live_ephemeral --api-base-url http://localhost:8001/v1 --no-save` 후 credential file 미생성 확인

## 2026-05-30 Frontend API URL normalization

> [!success]
> Frontend API URL 구성도 CLI의 API base URL hardening과 같은 수준으로 보강했습니다. 자세한 runtime config 계약은 [[Runtime Configuration#2026-05-30 Frontend API URL normalization]]에 정리합니다.

계약:

- `NEXT_PUBLIC_API_URL=http://localhost:8001/v1/`처럼 `/v1` suffix가 포함되어도 root `http://localhost:8001`로 정규화합니다.
- 모든 fetch URL은 `buildApiUrl(path)`를 통해 `${root}/v1${path}`로 생성합니다.
- GitHub OAuth URL도 같은 helper를 사용해 `/v1/v1/auth/github` drift를 막습니다.
- malformed URL, unsupported protocol, query/hash, URL credential은 fetch 전에 실패합니다.
- `agentfeed-dev/scripts/test-all.sh`에 Frontend contract test를 포함해 3-repo gate에서 계속 검증합니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 GitHub OAuth state CSRF protection

> [!success]
> GitHub OAuth login/callback이 signed state와 HttpOnly cookie를 함께 검증하도록 Backend auth 계약을 강화했습니다. 자세한 보안 계약은 [[Auth & Credential Safety#2026-05-30 GitHub OAuth state CSRF protection]]에 정리합니다.

계약:

- `/v1/auth/github`는 `state` query와 `agentfeed_oauth_state` cookie를 같이 발급합니다.
- state는 `next` path와 random nonce를 포함하고 `SECRET_KEY` HMAC signature로 보호됩니다.
- callback은 query state와 cookie state가 모두 존재하고 일치하며 signature가 유효해야 진행합니다.
- invalid/missing/tampered state는 `OAUTH_STATE_INVALID`로 실패합니다.
- state 검증은 GitHub token exchange보다 먼저 실행됩니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'oauth_state or github_login_sets or invalid_oauth_state'`
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/routers/auth.py tests/test_contracts.py`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI API POST timeout

> [!success]
> CLI의 browser login session 생성/교환과 draft preview/upload POST 요청이 무기한 대기하지 않도록 timeout/AbortSignal을 추가했습니다. 자세한 runtime 계약은 [[Runtime Configuration#2026-05-30 CLI API POST timeout]]에 정리합니다.

계약:

- CLI API POST 기본 timeout은 30초입니다.
- `AGENTFEED_API_TIMEOUT_MS`로 조정 가능합니다.
- timeout 시 `API_REQUEST_TIMEOUT`으로 실패합니다.
- publish/upload timeout은 local draft를 `uploaded: true`로 저장하지 않습니다.
- CLI auth session 생성/교환과 ingest preview/upload 모두 fetch signal을 전달합니다.

검증:

- `npx vitest run tests/api-hook.test.ts --testNamePattern "creates and exchanges|times out"`
- `npm test -- --run`
- `npm run typecheck`
- `npm run build`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Deleted user ingestion-token invalidation

> [!success]
> Backend ingestion-token dependency가 active user 조회(`users.deleted_at IS NULL`)를 통과한 뒤에만 CLI upload를 인증하도록 강화했습니다. 자세한 보안 계약은 [[Auth & Credential Safety#2026-05-30 Deleted user ingestion-token invalidation]]에 정리합니다.

계약:

- CLI token upload/preflight는 Backend `get_ingestion_user()` 인증 경로를 탑니다.
- token row가 존재하고 revoke되지 않았더라도 owning user가 soft-deleted이면 `IngestionTokenInvalid`입니다.
- `last_used_at` 갱신은 active user 확인 이후에만 수행합니다.
- JWT/cookie path의 `get_current_user_optional()`과 ingestion-token path가 같은 active-user 기준을 사용합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k ingestion_token`
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/dependencies.py tests/test_contracts.py`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI auth exchange active-user gate

> [!success]
> CLI browser-login의 approval → exchange 사이 race에서도 soft-deleted user가 새 ingestion token을 받을 수 없도록 Backend exchange 계약을 강화했습니다. 자세한 보안 계약은 [[Auth & Credential Safety#2026-05-30 CLI auth exchange active-user gate]]에 정리합니다.

계약:

- `/v1/auth/cli/sessions/{session_id}/approve`: 기존처럼 logged-in active user만 승인 가능
- `/v1/auth/cli/sessions/{session_id}/exchange`: 승인 후에도 `users.deleted_at IS NULL` user lookup을 다시 수행
- inactive user면 새 token을 만들지 않고 session을 consume하지 않음
- active user면 token 생성, `CliAuthSession.status=consumed`, `consumed_at` 설정

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'cli_auth_exchange'`
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/routers/auth.py tests/test_contracts.py`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Frontend production API env preflight

> [!success]
> Frontend가 production build에서 `NEXT_PUBLIC_API_URL` 누락 시 사용자 브라우저의 localhost를 호출하는 bundle을 만들지 않도록 preflight를 추가했습니다. 자세한 runtime 계약은 [[Runtime Configuration#2026-05-30 Frontend production API env preflight]]에 정리합니다.

계약:

- `npm run build`는 `node scripts/check-env.mjs && next build` 순서로 실행합니다.
- env 누락/invalid protocol/query/hash/credential은 Next build 전에 명시적으로 실패합니다.
- API root resolution은 lazy하게 수행해 module import/prerender 단계에서 불명확한 crash가 나지 않게 합니다.
- `agentfeed-dev/scripts/test-all.sh`는 명시적인 local API root로 Frontend build를 실행합니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`
- `env NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`
- `env -u NEXT_PUBLIC_API_URL npm run build` 실패 메시지 확인
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Worklog project ownership gate

> [!success]
> 수동 `POST /v1/worklogs` 생성 경로가 다른 사용자의 project UUID에 worklog를 붙여 project stats/feed를 오염시키지 못하도록 Backend ownership gate를 추가했습니다.

계약:

- `CreateWorklogRequest.project_id`가 있으면 `projects.id`, `projects.owner_id`, `projects.deleted_at IS NULL` 조건을 모두 만족해야 합니다.
- project가 없거나 현재 user 소유가 아니거나 soft-deleted이면 `Project not found`로 실패합니다.
- 성공 시 검증된 owned project id만 `Worklog.project_id`로 저장합니다.
- `project_id=None`인 worklog 생성 경로는 유지합니다.

검증:

- RED: 기존 `create_worklog()`는 project 조회 없이 `body.project_id`를 그대로 저장해 foreign/missing project test가 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'owned_active_project or rejects_foreign'`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/routers/worklogs.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI credential file permissions

> [!success]
> CLI 저장 credential은 이제 local secret으로 취급되어 `~/.agentfeed` `0700`, `credentials.json` `0600` mode로 생성/보정됩니다. 자세한 보안 계약은 [[Auth & Credential Safety#2026-05-30 CLI credential file permissions]]에 정리합니다.

검증:

- `npx vitest run tests/config.test.ts --testNamePattern 'private POSIX'` RED/GREEN
- `npm test -- --run tests/config.test.ts tests/version.test.ts`
- `npm run typecheck`
- `npm pack --dry-run`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI npm prepack release gate

> [!success]
> npm tarball이 stale `dist/`를 배포하지 않도록 `prepack`에서 `npm run build`를 실행합니다.

문제:

- CLI `bin`은 `./dist/cli/index.js`를 가리키고, package `files`도 `dist`를 포함합니다.
- publish 전 수동 build를 빼먹으면 `src` 수정과 다른 오래된 CLI binary가 npm package에 들어갈 수 있습니다.

계약:

- `package.json`은 `prepack: npm run build`를 유지합니다.
- release drift 방지를 위해 `tests/version.test.ts`가 package `files`와 `prepack` 계약을 함께 검증합니다.

검증:

- RED: `tests/version.test.ts`의 prepack 계약 테스트가 `undefined`로 실패
- GREEN:
  - `npm test -- --run tests/config.test.ts tests/version.test.ts`
  - `npm run typecheck`
  - `npm pack --dry-run`에서 `prepack` → `build` 실행 확인
  - `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Backend streamed ingest payload cap

> [!success]
> `/v1/ingest/*` payload 제한을 `Content-Length` header가 아니라 실제 ASGI request body byte 수 기준으로 강제합니다.

문제:

- 기존 middleware는 `Content-Length > 512KB`만 빠르게 거부했습니다.
- `Content-Length`가 없거나 실제 body보다 작게 spoof된 요청은 route parsing까지 도달할 수 있었습니다.
- ingest endpoint는 CLI가 보낼 수 있는 nested JSON을 받으므로, public write surface에서 memory/CPU pressure가 생길 수 있습니다.

계약:

- honest `Content-Length`가 limit 초과이면 즉시 `413 INGESTION_PAYLOAD_TOO_LARGE`를 반환합니다.
- header가 없거나 작아도 middleware가 request stream을 읽으며 실제 byte 수를 세고 `512KB` 초과 시 route handling 전에 `413`으로 차단합니다.
- 제한 이하 body는 middleware가 replay 가능하게 buffer해 downstream FastAPI parsing이 기존처럼 동작합니다.

검증:

- RED: spoofed small `Content-Length`와 no-content-length chunked oversized body가 기존 middleware에서 `call_next`까지 도달
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'payload_limit'`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/main.py tests/test_contracts.py`
  - `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Frontend project slug fallback

> [!success]
> Backend contract의 nullable `project.slug`와 Frontend project link 생성 계약을 맞춰, slug가 없으면 project id로 이동합니다.

문제:

- `ApiProjectSummary.slug`는 `string | null`입니다.
- Frontend adapter가 `null`을 빈 문자열로 바꾸면 `/projects/` dead link가 생성됩니다.

계약:

- `adaptProjectSummary()`는 `p.slug ?? p.id`를 사용합니다.
- `scripts/run-contract-tests.mjs`는 `src/lib/api-contract.test.ts`도 compile/run해서 adapter contract regression을 실제 gate에 포함합니다.

검증:

- RED: `npm run test:contracts`가 `project list links must fall back to project id when backend slug is null`로 실패
- GREEN:
  - `npm run test:contracts`
  - `npx tsc --noEmit --pretty false`
  - `env NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`
  - `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Windows path redaction

> [!success]
> CLI privacy scanner가 Windows absolute path를 public field에 남기지 않도록 보강했습니다. 자세한 redaction 계약은 [[Privacy Safety#2026-05-30 Windows path redaction]]에 정리합니다.

검증:

- RED/GREEN: `npx vitest run tests/privacy.test.ts --testNamePattern 'Windows absolute'`
- `npm test -- --run tests/privacy.test.ts tests/cli-share.test.ts tests/api-hook.test.ts tests/open-browser.test.ts`
- `npm run typecheck`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI open-review config 계약

> [!success]
> `collection.open_review_after_upload: true`가 설정된 기본 프로젝트에서는 `agentfeed publish` / human `agentfeed share`가 `--open-review` 없이도 review URL을 브라우저로 엽니다.

계약:

- `--open-review`는 항상 우선합니다.
- human output path의 `agentfeed share`와 `agentfeed publish`는 project config `open_review_after_upload`를 존중합니다.
- `agentfeed share --json`은 machine-readable output을 유지하기 위해 config 기반 auto-open을 하지 않고, 명시 `--open-review`만 허용합니다.
- `agentfeed collect --upload`은 내부적으로 publish path를 타므로 같은 설정을 상속합니다.

검증:

- RED/GREEN: `npx vitest run tests/cli-share.test.ts --testNamePattern 'opens the review URL'`
- `npm test -- --run tests/privacy.test.ts tests/cli-share.test.ts tests/api-hook.test.ts tests/open-browser.test.ts`
- `npm run typecheck`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Worklog comment visibility gate

> [!success]
> private worklog의 comments list/create endpoint가 worklog detail visibility와 같은 owner-only gate를 사용합니다.

문제:

- `GET /v1/worklogs/{id}`는 private worklog를 author 외 사용자에게 404로 숨겼습니다.
- 하지만 comments list/create path는 worklog visibility를 먼저 확인하지 않아 private worklog id를 아는 사용자가 댓글 접근/작성 경로로 metadata를 건드릴 수 있었습니다.

계약:

- private worklog comments는 author만 읽고 작성할 수 있습니다.
- author가 아닌 사용자는 detail endpoint와 동일하게 `Worklog not found`로 처리합니다.
- public/unlisted worklog comments는 기존처럼 접근 가능합니다.

검증:

- RED/GREEN: `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'private_worklog_comments'`
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/routers/worklogs.py tests/test_contracts.py`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Unlisted publish privacy gate

> [!success]
> unresolved high severity privacy finding이 있으면 public뿐 아니라 unlisted publish도 Backend/Frontend 양쪽에서 차단합니다.

문제:

- unlisted는 feed 노출은 제한되지만 URL 공유로 접근 가능한 공개 상태입니다.
- 기존 Backend publish guard는 `visibility == public`만 검사했고, Frontend review UI도 unlisted publish button은 활성 상태로 남았습니다.

계약:

- `POST /v1/worklogs/{id}/publish`는 visibility가 `public` 또는 `unlisted`일 때 unresolved high severity finding을 모두 차단합니다.
- Frontend review page는 같은 조건에서 `Publish public`과 `Publish unlisted`를 모두 disable하고, 직접 handler 호출도 guard합니다.
- `Make private` / unpublish 관리 경로는 이 gate와 별개로 유지합니다.

검증:

- RED/GREEN Backend: `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'publish_unlisted_rejects'`
- RED/GREEN Frontend: `npm run test:contracts`
- `npx tsc --noEmit --pretty false`
- `env NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`
- `../agentfeed-dev/scripts/test-all.sh`

## 관련 원본

- [[Cross Repo Integration Fixes#목표 end-to-end 흐름]]
- [[Cross Repo Integration Fixes#P1 — API contract drift 수정]]
- [[Cross Repo Integration Fixes#P2 — 제품 완성도]]

## 남은 검증 리스크

> [!success]
> 2026-05-30 현재 Docker dev stack에서 `make smoke-e2e`가 CLI upload → Backend review API → Frontend review route → publish → public detail/feed까지 통과했습니다.

- [x] Docker Desktop 실행 상태에서 `agentfeed-dev`의 `make smoke-e2e` 성공 확인
- [x] CLI → Backend → Frontend review/publish/feed smoke 재확인
- [x] OAuth 없이 재현 가능한 CLI browser-login token exchange 경로 test 보강
- [x] smoke 전용 ingestion token을 `/v1/ingest/status`로 upload 전 검증
- [ ] 실제 GitHub OAuth / CLI browser login happy path 재확인
- [ ] 실제 사용자 작업 repo에서 `agentfeed share --open-review` smoke

## 2026-05-30 계약 감사 결과

> [!warning]
> 수집 파트는 model 정보를 이미 draft/share preview에서 보유하지만, 당시 ingest 계약에는 `worklog.model`이 없어 Backend 저장 이후 정보가 사라졌습니다.

P1로 남길 계약 gap:

- CLI: `LocalDraft.worklog.model`은 존재하지만 `IngestWorklogRequest.worklog` / `draftToIngestRequest()`에 model이 없음
- Backend: ingest schema와 저장 경로가 model을 받지 않음
- Frontend: 타입/카드에서 model을 활용할 여지가 있으나 ingest 경로로 저장되지 않으면 표시할 수 없음

> [!todo]
> [[#2026-05-30 worklog.model ingest 계약]]에서 DB/Backend schema 기준으로 정리했습니다.

추가 P2 후보:

- [x] Frontend feed 정렬 라벨 `Most shipped`가 실제 UI에서 `most_discussed`로 매핑되는지 재확인 후 수정
- [x] Backend `/worklogs/{id}/unpublish`를 Frontend review/detail action에 연결할지 제품 정책 결정

## 2026-05-30 Feed sort label 계약

> [!success]
> Frontend Public Feed의 마지막 sort option은 Backend feed API의 `most_discussed` aggregate sort를 호출하므로 UI 라벨을 `Most shipped`에서 `Most discussed`로 맞췄습니다.

- Backend feed sort 계약: `latest`, `trending`, `most_liked`, `most_discussed`
- Frontend:
  - `FEED_SORT_OPTIONS = Latest / Trending / Most liked / Most discussed`
  - `feedSortParamFromLabel('Most discussed') = 'most_discussed'`
  - `FeedParams.sort`에서 feed용 `most_shipped`를 제거해 leaderboard 용어와 혼동을 줄임

> [!note]
> `most_shipped`는 leaderboard type에서는 계속 사용하지만, public feed sort UI에서는 comment aggregate가 필요한 위치이므로 `Most discussed`가 맞습니다.

## 2026-05-30 Publish management 계약

> [!success]
> Backend에 이미 있던 `POST /v1/worklogs/{id}/unpublish`를 Frontend API wrapper와 review/detail 관리 UX에 연결했습니다.

- Backend 기준:
  - publish: `POST /v1/worklogs/{id}/publish`
  - unpublish: `POST /v1/worklogs/{id}/unpublish`
- Frontend:
  - `worklogs.unpublish(id, 'private')` wrapper 추가
  - review 화면에서 이미 `public`/`unlisted`인 worklog는 **Make private**로 비공개 전환 가능
  - detail 화면에서 author/editor는 **Manage publishing** 버튼으로 review 관리 화면 진입
- 계약 테스트:
  - `worklogs.unpublish` wrapper 존재 확인
  - `public`/`unlisted`만 unpublish control 대상이고 `needs_review/private` draft는 제외

> [!note]
> 직접 삭제가 아니라 visibility/status를 private로 되돌리는 reversible publish 관리 액션으로 취급합니다.

## 2026-05-30 worklog.model ingest 계약

> [!success]
> DB column `worklogs.model`을 기준으로 Backend ingest/store/review 응답, CLI upload payload, Frontend review/detail 표시까지 `worklog.model` 계약을 연결했습니다.

- 기준 컬럼: `worklogs.model`
- Backend:
  - `IngestWorklogPayload.model`을 nullable field로 수신
  - `POST /v1/ingest/worklogs`에서 `Worklog.model`에 저장
  - `GET /v1/worklogs/{id}/review`, `GET /v1/worklogs/{id}`, `GET /v1/feed` 응답에서 first-class `model` 유지
- CLI:
  - `LocalDraft.worklog.model`을 `IngestWorklogRequest.worklog.model`로 업로드
  - `null` 허용으로 기존 collector/client와 호환
- Frontend:
  - API adapter가 card/detail model을 보존
  - review **Collection evidence**, review header, public detail header/metrics에서 표시
- Dev smoke:
  - Cursor-style session row의 `model=cursor-agent`가 draft → review API → public detail/feed까지 보존되는지 assertion 추가

> [!note]
> 모델명은 수집된 경우에만 보존하며, collector가 제공하지 않은 값을 추정해서 채우지 않습니다.

## 2026-05-30 E2E smoke gate 보강

> [!info]
> `agentfeed-dev/scripts/smoke-e2e.sh`는 Docker dev stack이 켜진 상태에서 CLI `share --json` → Backend ingest/review → Frontend review route → publish → public feed까지 검증합니다.

- Cursor-style 수집 payload의 `collection_quality=low`, `collection_sources[0].name=cursor` 확인
- `share --note`가 `summary`에 섞이지 않고 `user_note`로 draft/review/detail/feed까지 보존되는지 확인
- 현재 로컬 검증 상태: [[#2026-05-30 Docker smoke E2E 성공]]에서 실제 Docker smoke 통과

## 2026-05-30 Docker smoke E2E 성공

> [!success]
> `agentfeed-dev`에서 `make smoke-e2e`가 통과했습니다. 이 경로는 CLI가 만든 draft를 Backend에 업로드하고, Frontend review 화면에서 조회한 뒤 publish하여 public detail/feed까지 확인합니다.

검증 경로:

1. Docker compose dev stack health check
2. smoke 전용 user / ingestion token seed
3. `AgentFeed-CLI` local build
4. temporary Cursor-style project 생성
5. `agentfeed share --json --source cursor --session-file ... --note ... --all --no-clipboard`
6. `GET /v1/worklogs/{id}/review`
7. `GET /worklogs/{id}/review`
8. `POST /v1/worklogs/{id}/publish`
9. `GET /v1/worklogs/{id}` + `GET /v1/feed?agent=cursor`

추가 보정:

- `agentfeed-dev/compose.yaml`의 Frontend service에 `frontend-next:/workspace/frontend/.next` named volume을 추가했습니다.
- 이유: host의 `npm run build`와 Docker dev server가 같은 bind mount의 `.next`를 공유하면 Next dev manifest가 깨져 500이 발생할 수 있습니다.
- `node_modules`와 마찬가지로 container-owned volatile cache는 named volume으로 격리합니다.

검증:

- `curl -fsS -L http://localhost:3001`
- `make smoke-e2e`

## 2026-05-30 share --json upload draft 계약

> [!success]
> `agentfeed share --json`의 upload mode도 dry-run mode처럼 `draft` 객체를 함께 출력합니다. smoke script와 외부 자동화는 upload 결과(`upload`)와 실제 수집 draft(`draft`)를 한 JSON에서 검증할 수 있습니다.

계약:

- dry-run: `{ dry_run: true, reused_existing_draft, draft }`
- upload: `{ dry_run: false, reused_existing_draft, draft_id, draft, upload }`

이유:

- smoke gate는 `share --note`가 `summary`에 섞이지 않고 `draft.worklog.user_note`에 남는지 확인해야 합니다.
- Backend 응답만으로는 CLI가 어떤 draft를 업로드했는지 로컬 수집 계약을 검증하기 어렵습니다.
- JSON output은 터미널/자동화용 로컬 결과이므로, 이미 `.agentfeed/drafts/*.json`에 저장되는 public-safe draft를 함께 보여주는 쪽이 재현성이 높습니다.

검증:

- `tests/cli-share.test.ts`
- `make smoke-e2e`

## 2026-05-30 Feed time_range 계약

> [!success]
> Frontend feed의 시간 필터가 더 이상 UI-only 상태가 아니며 Backend `GET /v1/feed?time_range=...` 필터로 전달됩니다.

계약:

| UI label | Backend query |
| --- | --- |
| `오늘` | `time_range=today` |
| `이번 주` | `time_range=week` |
| `이번 달` | `time_range=month` |
| `전체` | `time_range=all` |

Backend:

- `today`: 최근 24시간
- `week`: 최근 7일
- `month`: 최근 30일
- `all` 또는 알 수 없는 값: 시간 필터 없음

검증:

- `agentfeed-backend/tests/test_contracts.py::test_feed_time_range_filter_maps_known_public_feed_options`
- `agentfeed-frontend/src/lib/api-contract.test.ts`
- `agentfeed-dev/scripts/smoke-e2e.sh`의 public feed 조회가 `time_range=week`를 포함
- `npx tsc --noEmit --pretty false`

## 2026-05-30 Leaderboard streak 계약

> [!success]
> profile stats와 leaderboard `longest_streak`에서 distinct active days proxy를 제거하고 실제 consecutive-day streak 계산으로 교체했습니다.

계약:

- `current_streak_days`: UTC publish day 기준, 오늘 또는 어제부터 이어지는 연속 public worklog day 수
- `longest_streak`: 선택된 leaderboard period 안에서 author별 가장 긴 연속 public worklog day 수
- 같은 날짜에 여러 worklog가 있어도 streak day는 1일로 계산

검증:

- current streak yesterday grace 테스트
- longest streak이 단순 distinct day count가 아니라 consecutive day count임을 검증
- leaderboard streak ranking helper 테스트

## 2026-05-30 Release/dev reproducibility 계약

> [!success]
> CLI release metadata와 local dev bootstrap을 상용 운영에 더 가깝게 정리했습니다.

CLI:

- `package.json` version을 `src/version.ts`가 읽고 `agentfeed doctor`와 draft `source.tool_version`이 같은 값을 사용합니다.
- `agentfeed-cli/<package version>` 포맷은 유지합니다.

Dev:

- `agentfeed-dev/scripts/cli-link.sh`: `npm install` → `npm ci`
- `agentfeed-dev/scripts/dev-native.sh`: `.env` 우선, 없으면 `.env.example` fallback
- `agentfeed-dev/scripts/dev-native.sh` / `compose.yaml`: Frontend dependency install은 lockfile 기반 `npm ci`
- `scripts/test-all.sh`에서 shell syntax와 reproducibility guard를 확인합니다.

## 2026-05-30 test-all gate 보강

> [!success]
> Docker daemon이 꺼진 환경에서도 3-repo 통합 회귀를 더 빨리 잡을 수 있도록 `agentfeed-dev/scripts/test-all.sh`에 static smoke gate와 Alembic offline migration chain 검증을 추가했습니다.

- `agentfeed-dev`: `bash -n scripts/smoke-e2e.sh`
- `AgentFeed-CLI`: `npm test -- --run`, `npm run typecheck`
- `agentfeed-frontend`: `npx tsc --noEmit`, `npm run build`
- `agentfeed-backend`: `pytest tests/test_contracts.py`, `alembic upgrade head --sql`
- `uv run`이 생성할 수 있는 미추적 `agentfeed-backend/uv.lock`은 검증 후 자동 정리

> [!note]
> 이 gate는 실제 Docker compose 기동을 대체하지 않습니다. `make smoke-e2e`는 여전히 Docker Desktop 실행 후 별도로 확인해야 합니다.

## 2026-05-30 Review evidence 계약

> [!success]
> Frontend review 페이지는 publish 전 검토 화면에서 수집 신뢰도를 판단할 수 있도록 Backend metrics의 `collection_quality`와 `collection_sources`를 함께 표시합니다.

- 기준 필드: `worklog.metrics.collection_quality`, `worklog.metrics.collection_sources`
- UI 위치: `WorklogReviewPage`의 **Collection evidence**
- 검증: `agentfeed-frontend`에서 `npx tsc --noEmit --pretty false`, `npm run build`

## 2026-05-30 Clipboard fallback 계약

> [!success]
> `agentfeed share` / upload 이후 review URL 전달 UX가 Linux desktop 환경에서도 더 안정적으로 동작하도록 clipboard command fallback을 확장했습니다.

- macOS: `pbcopy`
- WSL: `clip.exe`
- Linux: `xclip` → `wl-copy` → `xsel`
- 검증: `npm test -- tests/clipboard.test.ts --run`, `npm test -- --run`, `npm run build`

## 2026-05-30 user_note 계약

> [!important]
> 사용자가 `agentfeed share --note`로 입력한 공개 메모는 생성 요약(`summary`)에 섞지 않고 DB column `worklogs.user_note`를 기준으로 Backend → Frontend → CLI 계약을 맞춥니다.

- DB 기준 컬럼: `worklogs.user_note`
- Backend:
  - `IngestWorklogPayload.user_note`
  - `WorklogCard.user_note`
  - `WorklogReviewResponse.worklog.user_note`
- CLI:
  - `LocalDraft.worklog.user_note`
  - `IngestWorklogRequest.worklog.user_note`
  - privacy scanner가 `user_note`를 별도 public field로 redaction
- Frontend:
  - `ApiWorklogCard.user_note`
  - adapter의 `Worklog.userNote`
  - review/detail/feed card에서 author note 표시

> [!note]
> 이 결정으로 생성 요약은 수집/분석 결과만 담고, 사람의 맥락은 별도 공개 메모로 다뤄집니다.

## 2026-05-30 Search UI/API 계약

> [!success]
> Frontend Header의 검색 입력이 더 이상 장식용이 아니며, `GET /v1/search` 계약을 사용하는 `/search` 페이지로 연결됩니다.

계약:

- Header search form: `/search?q={query}`로 이동
- Search page: `q`와 `type` query string을 읽어 Backend `/search` 호출
- 지원 type: `worklogs`, `users`, `projects`, `prompts`
- `type`이 없으면 Backend 기본 all 검색 결과를 섹션별로 표시

Frontend 표시:

- Worklogs: 기존 `WorklogCard`와 social state hydration 재사용
- Users: `ApiUser` → `User` adapter 후 profile link
- Projects: Backend search가 제공하는 최소 project field를 기준으로 card 표시, `slug`가 없으면 `id` fallback
- Prompts: worklog detail link로 연결

검증:

- `agentfeed-frontend`: `npx tsc --noEmit --pretty false`
- `agentfeed-frontend`: `npm run build`에서 `/search` route 생성 확인
- `agentfeed-dev`: `./scripts/test-all.sh`

## 2026-05-30 Cursor pagination UX 계약

> [!success]
> Frontend에서 list API의 첫 페이지만 읽어 발생하던 truncation과 project false 404 위험을 줄였습니다.

보강 범위:

- `ProjectsPage`: `projects.list({ cursor, limit })` 기반 Load more
- `ProfilePage`: `users.worklogs(username, { cursor, limit })` 기반 Worklogs tab Load more
- `ProjectDetailPage`: `projects.list`를 cursor로 순회해 slug/id를 찾고, 첫 페이지 밖 project를 404로 오판하지 않음
- `ProjectDetailPage`: `projects.worklogs(projectId, { cursor, limit })` 기반 Load more

> [!note]
> Backend column/API 이름을 기준으로 유지했고, Frontend는 기존 `pagination.next_cursor` / `pagination.has_more` 계약을 그대로 사용합니다.

검증:

- `agentfeed-frontend`: `npx tsc --noEmit --pretty false`
- `agentfeed-frontend`: `npm run build`
- `agentfeed-dev`: `./scripts/test-all.sh`

## 2026-05-30 CLI login/token smoke 계약

> [!success]
> 실제 GitHub OAuth credential 없이도 CLI browser login의 핵심 token exchange/save 경로를 자동 검증합니다.

계약:

- `browserLogin({ noOpen: true })`는 브라우저를 열지 않고 CLI auth session을 생성합니다.
- CLI session 생성 request는 64 hex verifier와 device name을 보냅니다.
- exchange request는 같은 verifier로 session token을 교환합니다.
- 성공 시 `~/.agentfeed/credentials.json`에 `ingestion_token`, `api_base_url`, `user`가 저장됩니다.
- `agentfeed-dev/scripts/smoke-e2e.sh`는 upload 전에 seed ingestion token을 `GET /v1/ingest/status`로 검증합니다.

남은 수동 확인:

- [ ] 실제 GitHub OAuth app credential이 있는 환경에서 `/cli/authorize` approval UI까지 포함한 browser-login happy path

검증:

- `AgentFeed-CLI`: `npx vitest run tests/api-hook.test.ts`
- `AgentFeed-CLI`: `npm run typecheck`
- `agentfeed-dev`: `bash -n scripts/smoke-e2e.sh`
- `agentfeed-dev`: `make smoke-e2e`

## 2026-05-30 GitHub OAuth provider failure contract

> [!success]
> GitHub provider 장애나 HTTP failure가 Backend 내부 raw 500으로 새지 않고 `GITHUB_OAUTH_UNAVAILABLE` 503으로 변환되도록 보정했습니다.

문제:

- `get_github_access_token()` / `get_github_user()`에서 `httpx.HTTPError`가 그대로 bubble-up될 수 있었습니다.
- 브라우저 로그인과 CLI browser auth가 GitHub provider outage를 만났을 때 사용자는 generic 500만 보게 됩니다.

수정:

- token exchange 단계 실패는 `details.stage = "token_exchange"`로 표준화합니다.
- GitHub user fetch 단계 실패는 `details.stage = "github_user"`로 표준화합니다.
- provider HTTP status가 있는 경우 `details.provider_status_code`를 포함합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'github_access_token_exchange_translates or github_user_fetch_translates'`
- `uv run --with pytest --with pytest-asyncio pytest -q`
- `uv run --with ruff ruff check --select I,F app/services/auth.py tests/test_contracts.py`

## 2026-05-30 CLI duplicate ingest 409 재동기화

> [!success]
> CLI upload 중 이미 Backend가 같은 ingestion session을 저장한 경우, `409 DUPLICATE_INGESTION_SESSION`과 `review_url`을 성공 응답처럼 해석해 로컬 draft upload metadata를 복구합니다.

문제:

- 네트워크 timeout이나 CLI 재시도 후 Backend에는 worklog가 존재하지만 로컬 draft는 pending으로 남을 수 있었습니다.
- 기존 CLI는 duplicate 409를 hard error로 처리해 사용자가 valid review URL을 얻지 못하고 같은 draft를 계속 재시도할 수 있었습니다.

수정:

- duplicate 응답의 `details.review_url`을 필수 복구 증거로 사용합니다.
- `details.worklog_id`, `details.id`, 또는 `/worklogs/{id}/review` URL path에서 worklog id를 복구합니다.
- 복구 성공 시 `status = "already_uploaded"`, `reused_existing = true`로 반환하고 `.agentfeed/drafts/*.json`의 `upload` metadata를 저장합니다.

검증:

- `npx vitest run tests/api-hook.test.ts --testNamePattern 'duplicate ingestion'`
- `npm test -- --run tests/api-hook.test.ts`
- `npm run typecheck`

## 2026-05-30 Frontend unpublish control predicate

> [!success]
> Review 화면의 “Make private” 같은 unpublish control은 실제 publish 상태(`status`) 기준으로만 노출되도록 보정했습니다.

문제:

- 기존 `canUnpublishWorklog()`는 `status` 또는 `visibility` 중 하나라도 `public`/`unlisted`이면 true를 반환했습니다.
- `{ status: "needs_review", visibility: "unlisted" }`처럼 아직 publish되지 않은 record에도 관리 action이 노출될 수 있었습니다.

수정:

- unpublish 가능 여부를 `status === "public" || status === "unlisted"`로 축소했습니다.
- contract test에 draft-like unlisted visibility false-positive를 추가했습니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`

## 2026-05-30 OAuth state payload expiry

> [!success]
> GitHub OAuth state는 cookie `max_age`뿐 아니라 signed payload 내부 `exp`도 검증합니다.

문제:

- 기존 state는 HMAC signature와 cookie binding은 있었지만 payload 자체에는 만료 시간이 없었습니다.
- 브라우저나 프록시가 오래된 cookie를 보존하는 경우 stale state가 signature만 맞으면 통과할 수 있었습니다.

수정:

- `_encode_next_state()` payload에 `exp` unix timestamp를 포함합니다.
- `_decode_next_state()`는 query state, cookie state, signature, payload `exp`를 모두 검증합니다.
- 만료되었거나 `exp`가 없는 state는 `OAUTH_STATE_INVALID`로 거부합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k oauth_state`
- `uv run --with ruff ruff check --select I,F app/routers/auth.py app/routers/social.py tests/test_contracts.py`
- `uv run --with pytest --with pytest-asyncio pytest -q`

## 2026-05-30 Social mutation visibility gate

> [!success]
> `like`, `unlike`, `bookmark`, `unbookmark`, `report worklog` mutation은 대상 worklog가 현재 사용자에게 visible한지 먼저 검증합니다.

문제:

- 기존 `app/routers/social.py`는 `Like`/`Bookmark` mutation 전에 worklog visibility와 owner를 확인하지 않았습니다.
- 비소유자가 private worklog id를 알고 있으면 social state를 변경하고, like/bookmark notification payload로 private title이 노출될 수 있었습니다.

수정:

- social router가 worklogs router의 `_get_worklog_or_404()` / `_assert_worklog_visible_to_user()` guard를 재사용합니다.
- private worklog는 owner가 아니면 social mutation 전에 `NotFoundError`로 차단합니다.
- notification title은 visibility gate 통과 후에만 사용합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'private_worklog_like or private_worklog_bookmark'`
- `uv run --with ruff ruff check --select I,F app/routers/auth.py app/routers/social.py tests/test_contracts.py`
- `uv run --with pytest --with pytest-asyncio pytest -q`

## 2026-05-30 CLI hook uninstall no-op

> [!success]
> `agentfeed hook uninstall claude-code`는 기존 Claude settings file이나 AgentFeed hook이 없으면 config file을 새로 만들거나 rewrite하지 않는 no-op입니다.

문제:

- 기존 uninstall path는 `.claude/settings.json`이 없어도 `{}` 파일을 새로 생성했습니다.
- 제거 명령이 repository에 예기치 않은 config 파일을 남기면 local UX와 VCS hygiene가 나빠집니다.

수정:

- settings file이 없으면 즉시 `{ backupPath: null }`로 반환합니다.
- settings file은 있지만 AgentFeed hook이 없으면 backup/write를 생략합니다.
- 실제 AgentFeed hook이 제거될 때만 backup과 write를 수행합니다.

검증:

- `npx vitest run tests/api-hook.test.ts --testNamePattern 'does not create settings|installs Stop hook'`
- `npx vitest run tests/api-hook.test.ts`
- `npm run typecheck`

## 2026-05-30 Frontend comment submit lock

> [!success]
> Worklog detail comment 작성은 요청 중 중복 제출을 막고, 실패 시 입력값을 보존한 채 오류를 표시합니다.

문제:

- 기존 `WorklogDetailPage.submitComment()`는 pending state와 error UI가 없었습니다.
- 느린 네트워크에서 “남기기”를 반복 클릭하면 중복 POST가 발생할 수 있고, 실패하면 사용자에게 원인이 보이지 않았습니다.

수정:

- `commentSubmitting` / `commentSubmitError` 상태를 추가했습니다.
- `canSubmitComment(body, submitting)` 계약 helper를 추가해 blank/pending submit을 차단합니다.
- 성공 시에만 입력값을 비우고, 실패 시 입력값과 오류 메시지를 유지합니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`

## 2026-05-30 CLI draft id path safety

> [!success]
> CLI draft id는 파일 경로로 쓰이기 전에 안전한 id 형식인지 검증합니다. `../credentials` 같은 traversal id는 draft read/delete 경로에서 모두 거부됩니다.

문제:

- `readDraft()`와 `agentfeed discard --id`가 raw `--id`를 `.agentfeed/drafts/${id}.json` 경로에 직접 결합했습니다.
- crafted id가 `.agentfeed/drafts` 밖으로 escape해 `.agentfeed/credentials.json` 같은 파일을 읽거나 삭제할 수 있었습니다.

수정:

- `src/draft/paths.ts`에 `assertSafeDraftId()` / `draftPaths()`를 추가했습니다.
- draft id는 letters, numbers, underscore, hyphen만 허용하고 path separator / dot segment를 거부합니다.
- `readDraft()`, `writeDraft()`, `listDrafts()`, `discard`가 같은 safe path helper를 사용합니다.

검증:

- `npx vitest run tests/draft-id-path-safety.test.ts`
- `npm run typecheck`

## 2026-05-30 Private comment report visibility gate

> [!success]
> Private worklog의 comment는 owner가 아닌 사용자가 report mutation으로 접근할 수 없습니다.

문제:

- `POST /comments/{comment_id}/report`는 comment id만 있으면 report row를 생성했고, comment가 속한 worklog visibility를 확인하지 않았습니다.
- private worklog comment id가 노출된 경우 비소유자가 social/report mutation으로 private 영역에 접근할 수 있었습니다.

수정:

- social router에 `_get_visible_comment_or_404()`를 추가했습니다.
- comment와 worklog를 함께 조회한 뒤 `_assert_worklog_visible_to_user()`로 visibility를 검증합니다.
- 비소유자는 `NotFoundError`를 받고 report row가 생성되지 않습니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'private_worklog_comment_report'`
- `uv run --with ruff ruff check --select I,F app/routers/social.py app/routers/worklogs.py tests/test_contracts.py`
- `uv run --with pytest --with pytest-asyncio pytest -q`

## 2026-05-30 Header OAuth next preservation

> [!success]
> Header의 Sign in / Get started 버튼은 현재 path와 query를 GitHub OAuth `next`로 전달합니다.

문제:

- 기존 Header sign-in은 `auth.githubUrl()`을 next 없이 호출했습니다.
- `/search?q=codex` 같은 deep link에서 로그인하면 dashboard 기본 경로로 돌아가 맥락이 사라졌습니다.

수정:

- `signInWithGithub(next?: string)` 형태로 AppContext 계약을 확장했습니다.
- `Header`가 `usePathname()` + `useSearchParams()`로 현재 route를 계산해 OAuth `next`에 넣습니다.
- `authNextPath()` helper는 protocol-relative path를 `/`로 정규화합니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`

## 2026-05-30 Publish follower notification producer

> [!success]
> Public publish 전환 시 follower에게 `new_worklog_from_following` notification을 발행합니다.

문제:

- notification setting과 `new_worklog_from_following` 타입은 있었지만 publish flow에서 producer가 없었습니다.
- 사용자가 follow한 작성자의 public worklog가 feed에는 나타나도 알림으로는 전달되지 않았습니다.

수정:

- `publish_worklog()`가 `visibility="public"`이고 이전 visibility가 public이 아니었던 경우 follower ids를 조회합니다.
- 각 follower에 대해 `create_notification(type="new_worklog_from_following")`을 호출합니다.
- `create_notification()`을 그대로 사용해 per-user notification setting과 self-notification guard를 유지합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'publish_public_worklog_notifies_followers'`
- `uv run --with ruff ruff check --select I,F app/routers/social.py app/routers/worklogs.py tests/test_contracts.py`
- `uv run --with pytest --with pytest-asyncio pytest -q`

## 2026-05-30 CLI integration test build lock

> [!success]
> Parallel Vitest workers can no longer race while rebuilding `dist/` for CLI subprocess tests.

문제:

- 여러 CLI subprocess test file이 `beforeAll`에서 동시에 `npm run build`를 실행했습니다.
- `dist/api/client.js`가 재작성되는 순간 다른 test가 `dist/cli/index.js`를 실행하면 ESM export snapshot이 일시적으로 불일치해 `AgentFeedApiError` import가 실패할 수 있었습니다.

수정:

- `tests/build-cli.ts`에 repo-local build lock과 source mtime stamp를 추가했습니다.
- CLI subprocess tests는 직접 `npm run build`를 호출하지 않고 `ensureCliBuilt()`를 공유합니다.
- 첫 worker만 build를 수행하고, 나머지는 stamp freshness를 확인해 재빌드 race를 피합니다.

검증:

- `npx vitest run tests/cli-scan.test.ts tests/draft-id-path-safety.test.ts`

## 2026-05-30 Public surface published-status gate

> [!success]
> Public feed/search/explore/project/user surfaces now require worklogs to be `visibility=public`, `status=public`, and `published_at` present.

문제:

- 수동 worklog create API는 `visibility`를 받을 수 있지만 `status`는 `needs_review`로 시작합니다.
- 일부 public list/detail 보조 경로가 `visibility="public"`만 확인해 아직 review/publish되지 않은 worklog를 공개 surface에 섞을 수 있었습니다.
- Public project stats도 unpublished/private worklog metric을 집계할 여지가 있었습니다.

수정:

- Backend에 `public_worklog_filters()`를 추가해 public query 조건을 단일화했습니다.
- feed/following, explore/category, search/tag suggestion, leaderboard, user/project worklog list, public project stats가 모두 published-status gate를 사용합니다.
- direct worklog visibility guard는 owner가 아니면 published 상태를 요구합니다. Public direct read는 `visibility=public` + `status=public`, unlisted direct-link read는 `visibility=unlisted` + `status=unlisted`를 허용하고 둘 다 `published_at`가 필요합니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'unpublished_public_visibility or published_unlisted_worklog or public_list_requires_published_status or public_project_stats'`
- `uv run --with ruff ruff check --select I,F app/services/worklog_filters.py app/services/project.py app/services/user.py app/routers/worklogs.py app/routers/feed.py app/routers/projects.py app/routers/users.py app/routers/search.py app/routers/explore.py app/routers/leaderboard.py app/routers/tags.py tests/test_contracts.py`
- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Frontend nullable array adapter hardening

> [!success]
> Backend/migration payload에서 `tags`, `changed_areas`, `outcome`, `timeline`, collection arrays가 `null`이어도 UI adapter가 안전한 빈 배열로 정규화합니다.

문제:

- 일부 렌더러는 `tags.map`, `tags.slice`, `timeline.map`처럼 배열 전제를 사용합니다.
- API migration/legacy/corrupt payload가 `null`을 보내면 feed/worklog/project 화면이 런타임에서 깨질 수 있었습니다.

수정:

- `adaptWorklogCard()`, `adaptWorklog()`, `adaptProjectSummary()`, `adaptProjectDetail()`에 adapter-boundary array normalization을 추가했습니다.
- API 타입도 nullable array payload를 반영하도록 조정했습니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Comment settings enforcement

> [!success]
> Backend now enforces the author's `allow_comments` privacy setting before creating a new comment.

문제:

- `UserSettings.allow_comments`는 저장/조회/수정 API에 존재했지만 `POST /worklogs/{id}/comments`에서 확인하지 않았습니다.
- 작성자가 댓글을 끄더라도 인증 사용자가 공개 worklog에 계속 댓글을 만들 수 있어 privacy setting과 실제 API 동작이 어긋났습니다.

수정:

- `create_comment()`가 visibility gate 이후 `_assert_comments_allowed()`를 호출합니다.
- 작성자 본인은 자기 worklog에 follow-up comment를 남길 수 있고, 비작성자는 작성자 설정이 `allow_comments=false`이면 `403 Forbidden`을 받습니다.
- 실패 시 comment row, notification side effect, commit이 발생하지 않습니다.

검증:

- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'allow_comments or private_worklog_comments_are_not_creatable'`
- `uv run --with ruff ruff check --select I,F app/routers/worklogs.py tests/test_contracts.py`
- `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q`

## 2026-05-30 Frontend social mutation pending lock

> [!success]
> Like/bookmark controls now ignore re-entrant clicks while the previous mutation is in flight.

문제:

- Worklog cards와 detail page의 like/bookmark 버튼은 optimistic update를 했지만 pending guard가 없었습니다.
- 사용자가 빠르게 두 번 누르면 같은 worklog에 중복 mutation이 전송되어 count가 튀거나 네트워크 지터 상황에서 UI 상태가 흔들릴 수 있었습니다.

수정:

- `AppContext`가 worklog id별 `likePending` / `bookmarkPending` state와 ref-backed in-flight guard를 유지합니다.
- 카드 A/B/C, feed/search/explore/profile/project/detail surface가 pending 값을 전달하거나 버튼을 disable합니다.
- 실패 시 기존 optimistic rollback은 유지하고, 완료 시 pending state를 해제합니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --pretty false`
- `NEXT_PUBLIC_API_URL=http://localhost:8001/v1 npm run build`

## 2026-05-30 Soft-deleted project metadata gate

> [!success]
> Soft-deleted project는 더 이상 worklog card/detail/search/feed/explore/profile 표면에서 project metadata로 노출되지 않습니다.

문제:

- Public worklog 자체는 `public_worklog_filters()`로 걸러졌지만, card/detail 구성 중 `Worklog.project_id`로 `Project`를 직접 조회하는 경로는 `Project.deleted_at IS NULL`을 누락했습니다.
- 삭제된 project row가 남아 있으면 feed/search/explore/detail/profile 카드에 `name`/`slug`/`visibility`가 그대로 섞일 수 있었습니다.

수정:

- Backend에 `get_worklog_card_project(project_id, db)` shared helper를 추가하고 `Project.deleted_at.is_(None)` 조건을 단일화했습니다.
- `/feed`, `/explore`, `/search`, `/users/{username}/worklogs`, `/me/worklogs`, `/me/bookmarks`, `/worklogs/{id}`가 모두 helper를 사용합니다.
- `_build_project_card()`를 분리해 private project redaction과 soft-delete 방어를 같은 payload builder에 모았습니다.

검증:

- worklog card builder가 soft-deleted project payload를 `None`으로 처리하는 회귀 테스트
- shared helper SQL에 `projects.deleted_at IS NULL`이 포함되는지 회귀 테스트
- worklog detail/feed item 표면에서 deleted project metadata가 빠지는지 회귀 테스트
- `uv run --python 3.12 --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q` → `67 passed`
- `uv run --python 3.12 --with ruff ruff check ... --select F` → changed files unused-import check 통과

관련: [[Privacy Safety#2026-05-30 Soft-deleted project metadata gate]]


## 2026-05-30 CLI git-only duplicate test isolation

> [!success]
> Git-only duplicate draft 회귀 테스트가 개발자 홈의 Claude/Codex 로그 규모에 흔들리지 않도록 테스트 fixture의 agent auto-discovery를 명시적으로 비활성화했습니다.

문제:

- 해당 테스트는 agent session evidence가 없는 git-only duplicate guard를 검증해야 했습니다.
- 하지만 `initProject()`가 로컬 홈의 agent/plugin signal을 감지하면 no-source collect가 `.claude` / `.codex` session discovery를 수행해 환경에 따라 Vitest 5초 timeout을 넘을 수 있었습니다.

수정:

- `tests/duplicate-draft.test.ts` fixture에서 `.agentfeed/config.json`의 agent auto-source를 모두 false로 고정했습니다.
- explicit `--source codex` 성격의 다른 duplicate tests는 그대로 session-file 경로를 사용하므로 계약은 유지됩니다.

검증:

- `npm test -- tests/duplicate-draft.test.ts --run --testNamePattern 'reuses git-only drafts'`
- `../agentfeed-dev/scripts/test-all.sh` → CLI 141 tests, Frontend contract/type/build, Backend 67 tests, Alembic offline chain 통과


## 2026-05-30 Backend critical path rate-limit

> [!success]
> Auth, ingest, social mutation, comment mutation/report critical path에 dependency-free in-memory rate limit을 연결했습니다.

문제:

- Backend에는 `RateLimitError` 타입은 있었지만 실제 middleware가 없어 CLI auth session 생성/교환, ingest upload/preview, social/comment mutation이 burst abuse에 무방비였습니다.
- Ingest payload size limit은 body 크기만 막았고 요청 빈도는 제한하지 않았습니다.

수정:

- `app/middleware/rate_limit.py`를 추가해 endpoint별 fixed-window rule, UUID path normalization, token/IP identity key를 구현했습니다.
- 적용 경로:
  - `GET /v1/auth/github`, `GET /v1/auth/github/callback`
  - `POST /v1/auth/cli/sessions`, `POST /v1/auth/cli/sessions/{id}/approve|exchange`
  - `POST /v1/ingest/worklogs`, `POST /v1/ingest/worklogs/preview`
  - `POST /v1/worklogs/{id}/comments`
  - `POST|DELETE /v1/worklogs/{id}/like|bookmark`
  - `POST /v1/comments/{id}/report`, `POST /v1/worklogs/{id}/report`
- 인증 token/cookie가 있으면 raw token을 저장하지 않고 SHA-256 fingerprint bucket을 사용합니다. 없으면 `X-Forwarded-For` 첫 IP, `X-Real-IP`, client host 순서로 IP bucket을 사용합니다.
- 429 응답은 기존 error envelope와 `Retry-After` header를 반환합니다.

검증:

- critical path rule coverage 회귀 테스트
- UUID resource id normalization 회귀 테스트
- endpoint/identity bucket isolation 회귀 테스트
- token fingerprint/IP identity 회귀 테스트
- 429 response contract 회귀 테스트
- `uv run --python 3.12 --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q` → `72 passed`
- `uv run --python 3.12 --with ruff ruff check app/main.py app/exceptions.py app/middleware/rate_limit.py tests/test_contracts.py --select F,I`

> [!note] 운영 메모
> 초기 limiter는 dependency-free in-memory 구현이었지만, 이후 [[Auth & Credential Safety#2026-05-30 Shared database rate-limit store|shared database rate-limit store]]로 production/non-development scale-out bucket을 보강했습니다.

관련: [[Auth & Credential Safety#2026-05-30 Backend critical path rate-limit]]


## 2026-05-30 Backend shared database rate-limit store

> [!success]
> Backend rate-limit bucket을 production/non-development에서 Postgres 공유 저장소로 전환해 multi-worker/global quota가 process boundary를 넘도록 보강했습니다.

문제:

- 기존 `_RATE_LIMIT_BUCKETS`는 Python process-local map이라 uvicorn workers/horizontal replicas가 각각 quota를 따로 계산했습니다.
- Trusted proxy identity를 고쳐도 store가 process-local이면 scale-out 환경에서 burst abuse가 worker 수만큼 증폭될 수 있었습니다.

수정:

- `RATE_LIMIT_STORE=auto|memory|database` 설정을 추가했습니다.
- development `auto`는 memory, non-development `auto`는 database로 해석합니다.
- non-development에서 `RATE_LIMIT_STORE=memory`는 startup validation에서 거부합니다.
- `rate_limit_events` Alembic migration/model을 추가하고 `(bucket_name, identity_hash, occurred_at)` index를 둡니다.
- database store는 bucket+identity별 `pg_advisory_xact_lock` transaction lock을 잡은 뒤 expired event 삭제, active count/oldest 조회, allowed event insert를 수행합니다.
- persisted identity는 raw token/IP가 아니라 SHA-256 hash입니다.
- Middleware는 async limiter path를 사용하며, rule이 없는 endpoint는 store를 열지 않습니다.

검증:

- `uv run --python 3.12 --with pytest --with pytest-asyncio pytest tests -q` → 95 passed
- `uv run --python 3.12 --with ruff ruff check app/config.py app/main.py app/middleware/rate_limit.py app/models/__init__.py app/models/rate_limit.py tests/test_rate_limit_store.py alembic/versions/006_rate_limit_events.py`
- `uv run --no-sync --python 3.12 alembic upgrade head --sql` → `006_rate_limit_events` table/index SQL generated

관련: [[Auth & Credential Safety#2026-05-30 Shared database rate-limit store]], [[Runtime Configuration#2026-05-30 Backend RATE_LIMIT_STORE]]

## 2026-05-30 Frontend OAuth next allowlist + runtime API config UI

> [!success]
> Frontend GitHub OAuth 시작점은 allowlisted in-app path만 `next`로 전달하고, API URL 설정 오류는 전역 UI로 드러냅니다.

문제:

- `authNextPath()`가 `/`로 시작하고 `//`로 시작하지 않는지만 검사해 allowlist가 없었습니다.
- `auth.githubUrl(next)` 직접 호출은 unsafe `next`를 다시 검증하지 않았습니다.
- `NEXT_PUBLIC_API_URL` 설정 오류가 `auth.me()` 실패로 뭉개져 사용자에게는 단순 signed-out 상태처럼 보일 수 있었습니다.

수정:

- `src/lib/auth-next.ts`에 exact/prefix allowlist를 두고 protocol-relative, absolute URL, scheme-like, encoded backslash/slash, whitespace/control, dot-segment path를 거부합니다.
- unsafe path는 공격자 query까지 버리고 `/`로 fallback합니다.
- `auth.githubUrl(next)`도 helper를 통해 한 번 더 sanitize하고 unsafe `next`는 OAuth URL에서 생략합니다.
- `AppProvider`가 `getApiConfigError()`를 초기화 시점에 평가하고, 오류가 있으면 auth probing을 건너뛰며 전역 `role="alert"` banner를 렌더합니다.
- Header sign-in buttons는 API config 오류가 있을 때 disabled 처리해 click handler crash를 막습니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --incremental false`
- `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`
- `scripts/check-env.mjs` negative smoke:
  - unset `NEXT_PUBLIC_API_URL` → exit 1
  - `ftp://api.agentfeed.dev` → exit 1
  - `https://user:pass@api.agentfeed.dev` → exit 1
  - `https://api.agentfeed.dev?debug=true` → exit 1

관련: [[Auth & Credential Safety#2026-05-30 Frontend OAuth next allowlist]], [[Runtime Configuration#2026-05-30 Runtime API config failure UI]]

## 2026-05-30 Public metric privacy settings

> [!success]
> `show_*_publicly` privacy settings now affect public worklog metrics and aggregate stats instead of only being stored in `/me/settings`.

문제:

- `UserSettings`에는 token/cost/file/line/test 공개 여부가 있었지만 card/detail/stats read path가 `metrics_json`을 그대로 반환했습니다.
- Project/User public aggregate stats도 raw metrics를 합산해, 사용자가 비공개로 설정한 수치가 profile/project/feed/detail/search/explore에 남을 수 있었습니다.

수정:

- Backend `metric_privacy` service를 추가해 author settings를 `MetricPrivacy`로 읽고 worklog metrics를 field group 단위로 `null` 처리합니다.
- Public card 경로(feed/following/search/explore/category/project/user/bookmark)는 author가 아닌 viewer에게 privacy-filtered metrics를 반환합니다.
- Worklog public detail도 같은 필터를 적용하고, author/review 경로는 full metrics를 유지합니다.
- Project public stats와 User public stats는 숨김 metric이 하나라도 포함되면 해당 aggregate를 `null`로 반환해 partial sum을 실제 total처럼 보이지 않게 합니다.
- User activity `tokens_used`와 `most_tests_added` leaderboard도 해당 setting을 반영합니다.
- Frontend adapter/type/rendering은 `null` aggregate를 `0`으로 바꾸지 않고 `—`로 표시할 수 있게 보정했습니다.

검증:

- Backend contract tests: metric privacy card/detail/project/user/activity/leaderboard coverage 추가
- Frontend contract tests: project/user hidden metric null preservation coverage 추가
- `uv run --python 3.12 --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q` → `78 passed`
- `npm run test:contracts`
- `npx tsc --noEmit --incremental false`

관련: [[Privacy Safety#2026-05-30 Public metric privacy settings]]

## 2026-05-30 Review preview and project detail contract

> [!success]
> Review 화면과 project detail route가 Backend 계약을 더 직접적으로 따르도록 보정했습니다.

계약:

- Worklog review의 첫 public preview card는 `review.preview.card_title` / `review.preview.card_summary`를 렌더합니다.
- raw draft title/summary/user note는 private draft/source context로 분리해 표시합니다.
- Project detail page는 slug/id route에서 `projects.get(slugOrId)`를 먼저 호출합니다.
- public listing lookup은 direct detail 404 후 legacy fallback으로만 사용합니다.
- global security headers는 `/cli/authorize`를 포함한 모든 route에 anti-clickjacking policy를 적용합니다.

검증:

- `npm run test:contracts && npm run lint`
- `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build`

관련: [[Commercial Readiness Audit 2026-05-30#Frontend user-facing safety / runtime config]]

## 2026-05-30 Live E2E smoke gate hardening

> [!success]
> `agentfeed-dev/scripts/smoke-e2e.sh`가 실제 dev Compose stack 기준으로 CLI → API → Frontend 연결을 검증하도록 보강되었습니다.

계약:

- Backend helper는 running container의 dev environment를 그대로 사용합니다.
- Backend/frontend readiness는 deadline 기반 wait로 확인합니다.
- dev SQL echo 로그가 helper stdout에 섞여도 seed JSON은 마지막 line으로 안전하게 파싱합니다.
- CLI upload source의 `session_id`는 raw local session id가 아니라 hashed alias임을 검증합니다.
- `RATE_LIMIT_STORE` / `TRUSTED_PROXY_IPS`는 dev Compose env surface에 포함합니다.

검증:

- `./scripts/smoke-e2e.sh` → passed
- `../agentfeed-dev/scripts/test-all.sh` → passed

관련: [[Live E2E Smoke Gate Hardening 2026-05-30]], [[Commercial Readiness Audit 2026-05-30#2026-05-30 live E2E smoke hardening 루프]]


## 2026-05-30 Review and feed rendered smoke gate

> [!success]
> Live E2E smoke가 API semantic assertion뿐 아니라 Frontend review/feed route의 server-rendered shell도 확인합니다.

계약:

- CLI share upload 후 review API에서 source hashed session id, model, user note, `needs_review` status, public preview fields를 검증합니다.
- `/worklogs/{id}/review`는 curl 기준 HTTP 200과 app title/loading shell을 검증합니다.
- publish 후 public detail/feed API에서 seeded worklog가 노출되는지 검증합니다.
- `/feed`는 curl 기준 HTTP 200과 `Public Feed` metadata/page shell을 검증합니다.
- client-side hydrated card 내용은 browser automation 없이 HTML에 존재한다고 가정하지 않습니다.

관련 구현: [[Commercial Readiness Hardening - Auth Maintenance and Rendered Smoke 2026-05-30]]


## 2026-05-30 WorklogCard action wiring

> [!success]
> Public feed/search/profile/project cards의 Variant A comment/share controls가 더 이상 inert하지 않습니다.

계약:

- comment action은 worklog detail로 이동합니다.
- share action은 native share → clipboard permalink → detail open 순서로 fallback합니다.
- permalink는 `/worklogs/{id}`를 기준으로 생성하고 id를 URL encode합니다.
- contract test가 native share와 clipboard fallback URL을 검증합니다.

관련 구현: [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]


## 2026-05-30 Worklog comment capability contract

> [!success]
> Worklog detail comment composer가 Backend permission contract를 선반영하도록 `viewer_state.can_comment`를 추가했습니다.

계약:

- source of truth는 `user_settings.allow_comments`입니다.
- Backend detail payload는 viewer 기준 `viewer_state.can_comment`를 반환합니다.
- author는 자신의 worklog에 항상 comment 가능하고, anonymous viewer는 comment 불가입니다.
- Frontend detail composer는 `currentUser && viewerState.canComment`일 때만 input/submit을 활성화합니다.
- permission-disabled 상태는 API 실패 후에야 알리는 대신 disabled placeholder/notice로 먼저 안내합니다.

관련 구현: [[Commercial Readiness Hardening - Comment Capability and Theme Hydration 2026-05-30]]

## 2026-05-30 Worklog card can_comment propagation

> [!success]
> Feed/profile/project/explore/bookmark/search card payload도 detail payload와 같은 `viewer_state.can_comment` capability contract를 따릅니다.

계약:

- Backend가 viewer와 author settings를 기준으로 card-level `viewer_state.can_comment`를 계산합니다.
- anonymous viewer는 false, 작성자는 true, non-author viewer는 `allow_comments` 설정을 따릅니다.
- Frontend card/detail UI는 capability 필드를 API 실패 후 추정하지 않고 선제 gate로 사용할 수 있습니다.

관련 구현: [[Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30]]

## 2026-05-30 Unauthenticated social action guard

> [!success]
> Public card의 anonymous like/bookmark click은 더 이상 API mutation으로 진행되지 않고 GitHub OAuth login으로 이동합니다.

계약:

- signed-out 상태에서는 `toggleLike` / `toggleBookmark`가 pending state 또는 API call을 만들기 전에 종료합니다.
- 현재 path/query는 `authNextPath()`로 sanitize 된 뒤 OAuth `next`로 전달됩니다.
- API config error가 있으면 redirect도 시도하지 않아 설정 오류를 숨기지 않습니다.

관련 구현: [[Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30]]

## 2026-05-30 Feed filter URL sync

> [!success]
> `/feed`의 sort/time/agent/category filter가 query string과 동기화되어 reload/share/login redirect 후에도 유지됩니다.

계약:

- `sort=latest`, `time=week` 기본값은 URL에서 생략합니다.
- `sort=trending|discussed`, `time=today|week|month`, `agent=<agent>`, `category=<category>`를 URL에서 label state로 복원합니다.
- filter state 변경은 `router.replace(..., { scroll: false })`로 history spam을 줄입니다.
- `/feed` OAuth `next` allowlist는 `sort`, `time`, `agent`, `category`만 보존하고 unsafe param은 제거합니다.
- `useSearchParams()`를 쓰는 `/feed` page는 `Suspense` boundary 안에 둡니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --incremental false`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- `../agentfeed-dev/scripts/test-all.sh`
- `../agentfeed-dev/scripts/smoke-e2e.sh`

관련 구현: [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]

## 2026-05-30 Worklog share failure feedback

> [!success]
> Worklog card share/copy가 불가능한 환경에서도 사용자가 실패 이유를 볼 수 있고, 조용히 detail page로 이동하지 않습니다.

계약:

- share button은 Web Share API 성공, clipboard fallback 성공, unavailable 실패를 모두 결과 상태로 보존합니다.
- 결과 메시지는 `role="status" aria-live="polite"`로 노출합니다.
- unavailable 상태는 4초 후 자동으로 사라지며 card navigation과 섞이지 않습니다.
- 공유 URL과 메시지 생성은 `shareWorklog()` / `copyWorklogLink()` / `shareWorklogResultMessage()` helper에 모읍니다.

검증:

- `npm run test:contracts`
- `npx tsc --noEmit --incremental false`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- `../agentfeed-dev/scripts/test-all.sh`

관련 구현: [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]

## 2026-05-30 Smoke migration readiness

> [!success]
> live smoke는 seed data를 넣기 전에 running backend container에서 Alembic migration을 적용해 schema drift를 먼저 제거합니다.

계약:

- `agentfeed-dev/scripts/smoke-e2e.sh`는 stack readiness 확인 후 `alembic upgrade head`를 실행합니다.
- dev compose는 `INGESTION_TOKEN_TTL_DAYS`를 backend env로 전달합니다.
- smoke seed token은 `expires_at`을 명시해 backend model/API 계약과 맞춥니다.
- Alembic revision id는 기본 version table 길이와 호환되도록 32자 이하를 유지합니다.

검증:

- `../agentfeed-dev/scripts/test-all.sh`
- temporary Postgres DB + `alembic upgrade head` fresh online migration check
- `../agentfeed-dev/scripts/smoke-e2e.sh`

관련 구현: [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]

## 2026-05-30 Frontend settings/token surface

> [!success]
> Backend에 있던 settings/integration/token API가 signed-in Frontend `/settings` 화면으로 연결되었습니다.

계약:

- Header signed-in nav는 `/settings`를 노출합니다.
- `/settings`는 `me.settings()`, `me.integrations()`, `me.ingestionTokens()`를 함께 조회합니다.
- token list는 secret 없이 metadata만 표시하고, revoke는 `DELETE /v1/me/ingestion-tokens/{id}`를 호출합니다.
- privacy/notification toggles는 기존 settings update API를 사용합니다.
- OAuth `next` allowlist는 `/settings`를 허용하되 unsafe query/path는 계속 제거합니다.

검증:

- `npm run test:contracts && npm run lint`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- `../agentfeed-dev/scripts/test-all.sh && ../agentfeed-dev/scripts/smoke-e2e.sh`

관련 구현: [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]

## 2026-05-30 Token rotation end-to-end contract

> [!success]
> Backend rotation endpoints, CLI command, Frontend Settings action이 같은 one-time secret contract로 연결되었습니다.

End-to-end 흐름:

1. CLI는 saved token으로 `POST /v1/ingest/token/rotate`를 호출합니다.
2. Backend는 old token을 revoke하고 replacement token을 발급합니다.
3. CLI는 replacement raw token을 저장하고 stdout에는 secret을 숨깁니다.
4. Frontend `/settings`는 `POST /v1/me/ingestion-tokens/{id}/rotate`를 호출해 managed token을 교체합니다.
5. Frontend는 새 secret을 one-time notice로 표시하고 token list를 다시 조회합니다.

API/UX 정합성:

- Backend column/source of truth는 ingestion token `name`, `expires_at`, `revoked_at` metadata입니다.
- Frontend는 token id/name/expiry metadata를 그대로 사용하고 `tag` 같은 별도 alias를 만들지 않습니다.
- Raw token은 issue/exchange/rotate response에서만 존재합니다.

관련 구현: [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]]
