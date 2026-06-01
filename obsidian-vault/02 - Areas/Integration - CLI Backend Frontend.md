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

## 2026-06-01 Frontend worklog detail social stats soft-fail

> [!success]
> Worklog detail payload에서 비핵심 `social` stats가 누락돼도 핵심 content를 유지하고 social count만 zero fallback으로 렌더링합니다.

계약:

- Detail 필수 필드는 object, `id`, `title`, author identity입니다.
- Detail missing/null `social`은 likes/comments/bookmarks `0`으로 soft-fail합니다.
- List card missing `social`은 기존처럼 row drop을 유지해 list 품질을 지킵니다.
- Missing author/id/title은 author/profile/detail integrity 문제로 계속 reject합니다.

검증: [[Commercial Readiness Hardening - Frontend Worklog Detail Social Stats Soft Fail 2026-06-01#검증 증거]]

## 2026-06-01 Frontend external URL IPv6 safety

> [!success]
> Backend-provided project/profile URL이 Frontend outbound link로 렌더링되는 마지막 경계에서 private/internal IPv6 host를 차단합니다.

계약:

- Backend URL validation과 별개로 Frontend `safeExternalUrl()`이 public http(s) + credential-free + non-private host만 허용합니다.
- Project detail/settings/search 등 external link surface는 sanitizer를 통해 내부망/loopback 링크 클릭을 차단합니다.
- 기존 public URL display contract는 유지합니다.

검증: [[Commercial Readiness Hardening - Frontend External URL IPv6 Safety 2026-06-01#검증 증거]]

## 2026-06-01 Backend rate-limit store fail-closed degraded mode

> [!success]
> Backend production/shared rate-limit store 장애가 CLI/Frontend 요청 quota 우회로 이어지지 않도록 fail-closed + observable degraded response 계약을 추가했습니다.

계약:

- Backend middleware는 store exception을 process-local fallback으로 재시도하지 않습니다.
- CLI/Frontend/API clients는 `503 RATE_LIMIT_STORE_UNAVAILABLE`를 retryable infrastructure degradation으로 구분할 수 있습니다.
- 기존 `429 RATE_LIMITED` 응답 shape는 유지되어 일반 quota 초과와 장애 상태를 분리합니다.

검증: [[Commercial Readiness Hardening - Backend Rate Limit Store Fail Closed 2026-06-01#검증 증거]]

## 2026-06-01 Frontend dynamic auth next query allowlist

> [!success]
> Dynamic auth `next` redirect가 review/profile/project/worklog route-local safe query를 보존하면서 nested token/code/state류 query는 계속 제거하도록 고정했습니다.

계약:

- Exact path allowlist는 기존 static route 계약을 유지합니다.
- Dynamic route는 prefix allowlist로만 query key를 추가합니다.
- `/worklogs/:id/review`의 `finding`/`tab` deep-link context는 로그인 왕복 후 보존됩니다.
- Unknown query와 OAuth/security-sensitive query는 encoded `next` 안에서도 제거됩니다.

검증: [[Commercial Readiness Hardening - Frontend Dynamic Auth Next Query Allowlist 2026-06-01#검증 증거]]

## 2026-06-01 Frontend worklog detail retry safety

> [!success]
> Worklog detail primary payload가 malformed이거나 일시적으로 실패해도 crash/blank 대신 safe error state와 in-place retry를 제공합니다.

계약:

- `useWorklog(worklogId)`는 primary detail request와 retry trigger를 소유합니다.
- `Malformed worklog payload`는 사용자에게 안전한 retryable message로 변환합니다.
- Error state는 `Retry loading worklog`와 `Back to feed`를 함께 제공합니다.
- Comments는 secondary data로 유지되어 section-level failure가 primary detail을 지우지 않습니다.

검증: [[Commercial Readiness Hardening - Frontend Worklog Detail Retry Safety 2026-06-01#검증 증거]]


## 2026-06-01 Backend ENVIRONMENT fail-fast

> [!success]
> Backend runtime 환경명은 allowlist를 먼저 통과해야 하며, 오타/누락은 startup 단계에서 명확한 config 오류로 실패합니다.

계약:

- 유효 환경명은 `development`, `dev`, `local`, `production`, `staging`입니다.
- `prod`, 빈 문자열, `test` 같은 미지원 값은 `ENVIRONMENT must be one of: ...`로 fail-fast합니다.
- `staging`은 production-safe 정책을 적용받고 `is_production=True`입니다.
- 새 환경 alias를 추가할 때는 Backend allowlist와 contract test를 같이 변경합니다.

검증: [[Commercial Readiness Hardening - Backend Environment Fail Fast 2026-06-01#검증 증거]]


## 2026-06-01 Frontend auth expiry social cleanup

> [!success]
> 401/auth-expiry event와 sign-out이 같은 auth-scoped social cleanup path를 사용하도록 정렬했습니다.

계약:

- `AUTH_ERROR_EVENT_NAME` handler는 like/bookmark optimistic state, pending refs/state, social action error를 정리합니다.
- `signOut()`은 동일 helper를 재사용해 새 세션으로 stale state가 넘어가지 않게 합니다.
- unusable `auth.me()` payload와 auth-category API error도 signed-out state와 social state를 함께 정리합니다.

검증: [[Commercial Readiness Hardening - Frontend Auth Expiry Social Cleanup 2026-06-01#검증 증거]]


## 2026-06-01 Frontend CSP style inline hardening

> [!success]
> Frontend CSP에서 broad `style-src 'unsafe-inline'`을 제거하고 style element와 style attribute policy를 분리했습니다.

계약:

- `style-src`는 `'self'`와 Google Fonts stylesheet source만 허용합니다.
- `style-src-elem`은 nonce 경로를 포함해 future inline style element가 nonce 없이는 추가되지 않도록 합니다.
- 현재 React inline `style` attribute 호환성은 `style-src-attr 'unsafe-inline'`에만 남깁니다.

검증: [[Commercial Readiness Hardening - Frontend CSP Style Inline Hardening 2026-06-01#검증 증거]]


## 2026-06-01 Settings token revoke confirmation

> [!success]
> Settings token management에서 revoke가 rotate와 동일하게 destructive confirmation을 거친 뒤 Backend mutation을 호출하도록 고정했습니다.

계약:

- `revokeToken()`은 `window.confirm` 취소 시 `me.revokeIngestionToken(...)`을 호출하지 않습니다.
- revoke 성공 copy는 영향을 받는 CLI가 `agentfeed login` 또는 `agentfeed rotate`로 복구해야 함을 안내합니다.
- source contract가 confirmation과 recovery copy 재발을 차단합니다.

검증: [[Commercial Readiness Hardening - Settings Token Revoke Confirmation 2026-06-01#검증 증거]]










## 2026-06-01 Frontend detail/profile/leaderboard accessibility

> [!success]
> Public detail/profile/project/leaderboard/header surfaces now expose keyboard activation, selected state, busy state, and descriptive names for the major remaining interaction controls.

계약:

- Worklog detail author navigation and Profile project cards support keyboard activation.
- Profile/Project tab controls use tablist/tab state plus `aria-selected` and `aria-pressed`.
- Leaderboard filters expose selected state and leaderboard profile links have descriptive names.
- Header theme icon button exposes an accessible name and current dark-mode state.
- Worklog detail like/bookmark/comment/copy prompt controls expose accessible names/state/live feedback.
- Profile activity bars expose chart values without relying only on tooltip `title`.

검증: [[Commercial Readiness Hardening - Frontend Detail Profile Leaderboard Accessibility 2026-06-01#검증 증거]]

## 2026-06-01 Frontend accessibility and CLI login timeout polling

> [!success]
> Feed/worklog discovery surface의 keyboard accessibility를 보강하고, CLI browser-login polling timeout 경계값을 deterministic regression으로 고정했습니다.

계약:

- Worklog cards are keyboard focusable and support `Enter`/`Space` open without stealing nested button keystrokes.
- Feed trending worklogs use semantic Next.js `Link` navigation instead of anchor-without-href click handling.
- Icon-only like/bookmark and filter/category controls expose accessible labels or selected state.
- Global `:focus-visible` styling preserves visible keyboard focus after input outline resets.
- CLI browser-login polling does not perform an extra exchange/sleep after sleeping through the remaining timeout window.

검증: [[Commercial Readiness Hardening - Frontend Accessibility and CLI Login Timeout Polling 2026-06-01#검증 증거]]

## 2026-06-01 CLI upload timeout reconciliation

> [!success]
> CLI upload timeout이 서버-side 성공과 겹친 경우, 재시도 duplicate ingest 응답을 trusted review URL 검증 후 성공 재동기화로 처리하는 계약을 고정했습니다.

계약:

- upload timeout은 bounded retry 대상이며, 최종 timeout이면 draft는 pending 상태로 남습니다.
- retry에서 `DUPLICATE_INGESTION_SESSION`이 오면 trusted `review_url` + worklog id가 있을 때만 `already_uploaded`로 persisted sync합니다.
- duplicate `review_url`이 untrusted origin/path/query/hash를 포함하면 success로 신뢰하지 않습니다.
- retry payload의 `source.local_draft_id`는 동일 draft 안에서 stable하게 유지됩니다.
- timeout UX copy는 같은 publish/share command 재실행으로 duplicate reconciliation 가능성을 안내합니다.

검증: [[Commercial Readiness Hardening - CLI Upload Timeout Reconciliation 2026-06-01#검증 증거]]

## 2026-06-01 Frontend interaction pending guards

> [!success]
> Landing hero preview의 local-only like/bookmark illusion을 제거하고 Feed rising-builders follow에 per-username pending guard를 추가했습니다.

계약:

- Landing hero like/bookmark는 shared social action path(`toggleLike`, `toggleBookmark`)와 `getWorklogSocialState()`를 사용합니다.
- Landing hero share는 `shareWorklogLink()`를 사용하며 `sharePendingRef`로 duplicate share launch를 막습니다.
- Feed rising-builder follow는 username별 pending ref/state로 중복 mutation을 차단합니다.
- Follow 실패는 sidebar action-level error로 표시하고 optimistic state를 rollback합니다.

검증: [[Commercial Readiness Hardening - Frontend Interaction Pending Guards 2026-06-01#검증 증거]]

## 2026-06-01 Backend request ID observability

> [!success]
> Backend HTTP response와 request log에 `X-Request-ID` 기반 correlation contract를 추가했습니다.

계약:

- safe inbound `X-Request-ID`는 echo하고 unsafe/missing value는 opaque ID로 교체합니다.
- 정상 응답, middleware reject 응답, controlled internal-error 응답 모두 `X-Request-ID`를 포함합니다.
- request log는 `request_id`, `method`, query 없는 `path`, `status_code`, `duration_ms`만 structured field로 남깁니다.
- unexpected error 응답은 `INTERNAL_SERVER_ERROR` envelope와 `request_id`만 반환해 raw exception을 숨깁니다.

검증: [[Commercial Readiness Hardening - Backend Request ID Observability 2026-06-01#검증 증거]]

## 2026-06-01 Compose health readiness

> [!success]
> `agentfeed-dev` local Compose stack이 Backend/Frontend healthcheck와 detached readiness gate를 갖췄습니다.

수정:

- Postgres, Backend, Frontend에 `restart: unless-stopped`를 추가했습니다.
- Backend는 `/health`, Frontend는 Next dev root route를 컨테이너 내부 healthcheck로 확인합니다.
- Frontend는 Backend `service_healthy` 이후 시작합니다.
- `make up`은 detached stack 시작 후 `scripts/wait-ready.sh`로 세 서비스 healthy 상태를 기다립니다.
- `make wait`는 이미 떠 있는 stack의 동일 readiness contract를 확인합니다.
- `scripts/test-wait-ready.sh`가 Docker stub으로 healthy/missing/unhealthy/timeout 경로를 검증합니다.

검증:

- `./scripts/test-wait-ready.sh` passed
- `docker compose --env-file .env.example config --quiet` passed
- `agentfeed-dev make test` passed
- Parallel code-review agent 지적사항 반영 완료

관련 작업 노트: [[Commercial Readiness Hardening - Compose Health Readiness 2026-06-01]]

## 2026-06-01 Feed Search retry UX

> [!success]
> Feed/Search public discovery 화면이 transient API failure에서 현재 context를 보존한 retry path를 제공합니다.

수정:

- `useFeed()`가 현재 feed params를 다시 요청하는 `retryFeed()` trigger를 제공합니다.
- Feed initial failure는 현재 필터 보존 retry CTA를 렌더링합니다.
- Feed load-more failure는 기존 목록을 유지하고 retry CTA만 표시합니다.
- Search initial failure는 query/filter URL state를 보존한 `retrySearch()`를 제공합니다.
- Search load-more failure는 기존 결과를 유지하고 일반 Load more CTA와 retry CTA 중복을 방지합니다.
- Source contract가 retry trigger, context-preserving copy, duplicate CTA 방지를 고정합니다.

검증:

- Frontend contracts/typecheck/lint/build passed
- `agentfeed-dev make test` passed
- Parallel code-review agent 지적사항 반영 완료

관련 작업 노트: [[Commercial Readiness Hardening - Feed Search Retry UX 2026-06-01]]

## 2026-06-01 Landing API-backed preview

> [!success]
> Landing page hero preview가 Backend public Explore/Feed API와 연결되어, production 첫 화면이 static demo worklog 대신 실제 공개 worklog 또는 안전한 fallback을 표시합니다.

수정:

- Frontend landing preview가 `explore.get()`의 `trending_worklogs`를 우선 사용합니다.
- Explore 결과가 없으면 `feed.list({ sort: 'trending', time_range: 'all', limit: 1 })`로 fallback합니다.
- `adaptWorklogCards()`로 API payload를 shared worklog card contract에 맞게 정규화합니다.
- API failure/empty state에서 `/feed` 안내 card를 표시합니다.
- Source contract test가 `WORKLOGS[0]` / `USERS[` fixture 회귀를 차단합니다.

검증:

- Frontend contracts/lint/build passed
- `agentfeed-dev make test` passed

관련 작업 노트: [[Commercial Readiness Hardening - Landing API Backed Preview 2026-06-01]]

## 2026-06-01 Worklog author mock fallback removal

> [!success]
> Worklog card author identity가 Frontend static demo user map으로 오염되지 않도록 `_author` 우선 + generic username fallback 계약으로 정렬했습니다.

수정:

- `getWorklogAuthor()`에서 `USERS` import와 static mock fallback을 제거했습니다.
- Backend-normalized adapter `_author`가 있을 때만 display name/avatar metadata를 사용합니다.
- `_author`가 없으면 username 기반 generic identity와 deterministic avatar colors를 생성합니다.
- Source contract가 static mock user fallback 재도입을 차단합니다.

검증:

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` in `agentfeed-frontend` → passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Worklog Author Mock Fallback Removal 2026-06-01]]

## 2026-06-01 Feed tag filter contract

> [!success]
> Explore popular tag 링크가 Feed URL state와 Backend `/v1/feed?tag=` request까지 유지됩니다.

수정:

- Frontend `feedQueryFromParams()`가 `tag`를 URL sync에 포함합니다.
- Feed page가 `searchParams.get('tag')`를 hydrate하고 `useFeed()` params로 전달합니다.
- Active tag chip과 clear action을 추가했습니다.
- Feed header의 hard-coded `최근 24시간 ↑ 36` metric을 제거했습니다.
- Source contract가 Explore tag link, Feed tag hydration, Backend param propagation, hard-coded metric 제거를 고정합니다.

검증:

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` in `agentfeed-frontend` → passed
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Feed Tag Filter Contract 2026-06-01]]

## 2026-06-01 CLI npm package launch metadata

> [!success]
> CLI package metadata와 README install guidance가 npm launch 전 상태와 맞도록 정렬되었습니다.

수정:

- `package.json`에 keywords, homepage, repository, bugs URL, `packageManager`를 추가했습니다.
- README가 Node.js 20+ 요구사항과 pre-publish `npm pack --dry-run` 검증 경로를 안내합니다.
- README에서 실제 publish 전 registry 상태와 맞지 않는 “published” 표현을 제거했습니다.
- `tests/version.test.ts`가 release metadata drift를 막습니다.

검증:

- `npm view agentfeed-cli version` → registry `E404 Not Found` 확인
- `npm --version` → `11.6.0`
- 최종 CLI package gate는 작업 노트 검증 목록을 따릅니다.

관련 작업 노트: [[Commercial Readiness Hardening - CLI NPM Package Metadata 2026-06-01]]

## 2026-06-01 Frontend CSP fail-closed and Backend readiness

> [!success]
> Frontend runtime CSP가 invalid API URL을 localhost로 대체하지 않고 fail-closed 하며, Backend는 DB/migration-aware readiness probe를 제공합니다.

수정:

- Frontend API URL normalization을 `src/lib/api-url.ts`로 분리하고 `api.ts`와 `security-headers.ts`가 공유합니다.
- CSP `connect-src`는 valid API origin만 추가하고, invalid API root는 `'self'`만 허용합니다.
- Backend `/health/ready`가 DB connectivity, current Alembic revision, expected migration head를 비교합니다.
- DB unavailable 또는 stale migration이면 readiness가 `503`을 반환합니다.
- Dev Compose Backend healthcheck와 wait output을 `/health/ready` 기준으로 전환했습니다.

검증:

- Frontend `npm run ci` 및 manual invalid env checks → passed/failed as expected
- Backend ruff + full pytest + Alembic offline migration chain → passed
- Dev wait-ready contract, OpenAPI contract, Compose config → passed

관련 작업 노트: [[Commercial Readiness Hardening - Frontend CSP and Backend Readiness 2026-06-01]]

## 2026-06-01 Cross repo CI gates

> [!success]
> CLI, Frontend, Backend에 PR/push CI gate를 추가하고, `agentfeed-dev make test`가 동일한 핵심 gate를 로컬 통합 검증으로 실행하도록 정렬했습니다.

수정:

- CLI CI가 tests, typecheck, `release:preflight`, production dependency audit를 실행합니다.
- CLI `release:preflight`가 built `agentfeed --help` smoke를 검증합니다.
- Frontend CI가 `scripts/run-ci.mjs`를 통해 typecheck, API contract tests, production build를 한 번에 실행합니다.
- Frontend `.env.local.example`과 README를 추가해 `NEXT_PUBLIC_API_URL` 배포 계약을 문서화했습니다.
- Backend CI가 locked uv sync, ruff, pytest, Alembic offline migration chain을 실행합니다.
- `agentfeed-dev/scripts/test-all.sh`가 CLI `release:preflight`와 Frontend `ci` script를 직접 호출하도록 업데이트했습니다.

검증:

- CLI targeted release tests/typecheck/preflight/audit → passed
- Frontend `npm run ci` + audit → passed
- Backend ruff/pytest/offline Alembic → passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Cross Repo CI Gates 2026-06-01]]

## 2026-06-01 CLI release preflight and provenance

> [!success]
> CLI npm publish 전 repository-side preflight가 package metadata, built tarball contents, local-only payload exclusion, provenance caveat를 한 번에 검증합니다.

수정:

- `npm run release:preflight`가 `npm pack --dry-run --json`을 통해 `prepack` build/typecheck/test gate와 tarball contents를 검증합니다.
- Pack JSON parser가 lifecycle stdout prefix를 허용하고, direct-run guard가 Windows-style path에서도 silent no-op으로 빠지지 않도록 보강했습니다.
- `tests/release-preflight.test.ts`가 required built files, forbidden local-only files, metadata/public publish guardrail, direct invocation guard를 행동 기반으로 고정합니다.
- README에 npm provenance/trusted publishing 공식 문서와 private repo caveat를 명시했습니다.
- `UNLICENSED`는 owner license 결정 전 all rights reserved / no usage grant 상태로 유지합니다.

검증:

- `node --check scripts/release-preflight.mjs` → passed
- `npm test -- --run tests/version.test.ts tests/release-preflight.test.ts` → passed
- `npm run typecheck` → passed
- `npm run release:preflight` → passed
- `npm test -- --run && npm run typecheck` → passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - CLI Release Preflight and Provenance 2026-06-01]]


## 2026-06-01 CLI trusted publishing enforcement

> [!success]
> CLI npm release path가 OIDC trusted publishing workflow, package provenance setting, release workflow preflight validation으로 고정되었습니다.

계약:

- `publishConfig.provenance: true`로 package-level provenance intent를 fail-closed로 둡니다.
- Release workflow는 `id-token: write`, GitHub-hosted `ubuntu-latest`, Node.js `22.14.0`, npm `11.6.0`, `environment: npm-publish`를 사용합니다.
- Workflow는 장기 npm token(`NODE_AUTH_TOKEN`, `NPM_TOKEN`) 없이 `npm publish --access public`을 실행합니다.
- Trusted publishing에서는 npm이 provenance를 자동 생성하므로 `--provenance` flag를 금지합니다.
- `release:preflight`가 release workflow contract까지 검증합니다.
- Private repo에서는 provenance statement가 생성되지 않으므로 production release 전 public repo + npm trusted publisher 설정이 필요합니다.

검증: [[Commercial Readiness Hardening - CLI Trusted Publishing Enforcement 2026-06-01#검증 증거]]

## 2026-05-31 Cross-repo OpenAPI contract gate

> [!success]
> `agentfeed-dev make test`가 Backend OpenAPI를 export하고 CLI/Frontend runtime API endpoint matrix를 검증하므로, 3개 레포 간 path/method/JSON response drift가 CI 전에 로컬에서 잡힙니다.

수정:

- `scripts/check-openapi-contract.mjs`가 FastAPI app에서 OpenAPI schema를 생성합니다.
- CLI 6개, Frontend 57개 endpoint의 `{method, path}` 존재와 JSON success response를 확인합니다.
- Backend-only endpoint 5개는 reason과 함께 분류해 숨은 제품 gap이 되지 않도록 했습니다.
- `scripts/test-all.sh`와 `README.md`에 gate를 연결했습니다.

검증:

- `node scripts/check-openapi-contract.mjs` → passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]






## 2026-06-01 Project mutation surface

> [!success]
> Project create/edit/delete Backend API가 Frontend Projects/Project Detail UX와 dev OpenAPI client gate에 연결되어, project mutation endpoints가 더 이상 backend-only product gap이 아닙니다.

수정:

- Frontend `projects.create()` / `projects.update()` / `projects.delete()` helper를 추가했습니다.
- Projects page가 signed-in create form을 제공하고 성공 시 owner-aware project route로 이동합니다.
- Project detail page가 owner-gated edit/delete panel을 제공하고 Backend project id로 mutation합니다.
- Delete는 project name confirmation 후 soft-delete API를 호출하고 `/projects`로 이동합니다.
- Backend/Frontend project mutation surface를 먼저 연결했고, nullable field clear는 후속 [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]에서 해결했습니다.
- Dev OpenAPI gate에서 `POST/PATCH/DELETE /v1/projects`를 frontend client contract로 승격했습니다.

검증:

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → passed (`client contracts: 66`, backend-only: `2`)
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Project Mutation Surface 2026-06-01]]

## 2026-06-01 Project nullable field clear semantics

> [!success]
> Project edit에서 `description`, `repository_url`, `homepage_url`을 빈 값으로 지우면 Frontend가 explicit `null`을 보내고 Backend가 nullable column clear로 저장합니다.

수정:

- Backend `PATCH /v1/projects/{project_id}`가 `exclude_unset=True`로 omitted field와 explicit `null`을 구분합니다.
- Backend는 `description`, `repository_url`, `homepage_url`만 nullable clear 대상으로 허용하고 non-nullable fields의 explicit `null`은 기존 값을 보존합니다.
- Frontend create serializer는 blank optional fields를 omit하고, update serializer는 blank nullable fields를 `null`로 보냅니다.
- Project detail edit 화면의 clear 차단 guard를 제거했습니다.

검증:

- Backend targeted project update/null-clear tests + ruff passed
- Frontend contract + typecheck/lint passed
- Dev OpenAPI contract gate passed
- `make test` in `agentfeed-dev` passed

관련 작업 노트: [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]

## 2026-06-01 Project clear smoke gate

> [!success]
> `agentfeed-dev make smoke-e2e`가 project nullable clear semantics를 API와 hydrated Frontend DOM까지 검증합니다.

수정:

- smoke가 CLI upload로 생성된 project id를 owner-authenticated worklog detail에서 가져옵니다.
- project `PATCH`에서 omitted nullable fields가 기존 값을 유지하는지 검증합니다.
- project `PATCH`에서 explicit `null` nullable fields가 clear되는지 검증합니다.
- clear 후 project detail API와 hydrated project detail DOM이 이전 description/repository/homepage 값을 노출하지 않는지 검증합니다.
- Backend timestamp response의 `Z` suffix를 smoke parser가 허용하도록 보강했습니다.

검증:

- `make test` in `agentfeed-dev` passed
- `make smoke-e2e` in `agentfeed-dev` passed

관련 작업 노트: [[Commercial Readiness Hardening - Project Clear Smoke Gate 2026-06-01]]

## 2026-06-01 Public activity tab

> [!success]
> Backend의 `/v1/users/{username}/activity` 계약이 Frontend Profile Activity tab과 dev OpenAPI client gate에 연결되어, public activity API가 더 이상 backend-only product gap이 아닙니다.

수정:

- Frontend `users.activity()` helper를 추가했습니다.
- Profile page가 worklogs/projects/activity를 secondary `Promise.allSettled`로 불러와 partial failure를 격리합니다.
- Activity tab이 sessions, token visibility, public worklog day bars를 표시합니다.
- Dev OpenAPI gate에서 public activity endpoint를 client contract로 승격했습니다.

검증:

- Frontend contract + typecheck/lint passed
- Dev OpenAPI contract gate passed

관련 작업 노트: [[Commercial Readiness Hardening - Public Activity Tab 2026-06-01]]


## 2026-06-01 Report actions surface

> [!success]
> Backend의 worklog/comment report API가 Frontend Worklog detail UX와 dev OpenAPI client gate에 연결되어, moderation report endpoints가 더 이상 backend-only product gap이 아닙니다.

수정:

- Frontend `social.reportWorklog()` / `social.reportComment()` helper를 추가했습니다.
- Worklog detail page가 worklog와 comment report action을 제공합니다.
- signed-out report 시도는 현재 경로를 보존한 로그인 흐름으로 이어집니다.
- report form은 Backend reason enum과 optional description 계약을 그대로 사용합니다.
- Dev OpenAPI gate에서 report endpoints를 client contract로 승격했습니다.

검증:

- Frontend contract + typecheck/lint passed
- Dev OpenAPI contract gate passed

관련 작업 노트: [[Commercial Readiness Hardening - Report Actions Surface 2026-06-01]]


## 2026-05-31 Profile username settings surface

> [!success]
> Backend의 `/v1/me/profile`, `/v1/me/username` 계약이 Frontend Settings UX와 dev OpenAPI client gate에 연결되어, public identity API가 더 이상 backend-only product gap이 아닙니다.

수정:

- Backend profile update가 blank text를 normalize하고 nullable profile fields를 clear할 수 있게 했습니다.
- Frontend `me.updateProfile()` / `me.setUsername()` helper를 추가했습니다.
- Settings page가 display name, username, bio, location, website, GitHub, X를 저장하고 AppContext identity를 즉시 갱신합니다.
- Dev OpenAPI gate에서 profile/username endpoints를 client contract로 승격했습니다.

검증:

- Backend targeted profile tests + ruff passed
- Frontend contract + typecheck passed
- Dev OpenAPI contract gate passed

관련 작업 노트: [[Commercial Readiness Hardening - Profile Username Settings Surface 2026-05-31]]


## 2026-05-31 Browser-approved token rotation contract

> [!success]
> CLI, Backend, and Frontend token rotation now share one trust boundary: raw replacement tokens require browser/session-authenticated ownership, not just possession of an ingestion token.

Backend:

- Ingestion-token endpoint `/ingest/token/rotate` is disabled for minting replacements.
- The disabled endpoint is deprecated in OpenAPI and exposes only the 403 remediation contract, not a raw-token success schema.
- CLI auth session create accepts `replace_token_id`.
- CLI auth exchange rotates the requested token only after browser approval and user ownership verification.
- Settings-managed `/me/ingestion-tokens/{id}/rotate` remains the browser-session path for manual token management.

CLI:

- `agentfeed rotate` no longer calls token self-rotation.
- The stale `rotateIngestionToken()` helper and success mock were removed so internal tests cannot reintroduce the old trust boundary.
- It uses `/ingest/status` only to discover the saved token id, then hands replacement to browser-approved exchange.
- README documents the new rotation model.

Frontend:

- Existing Settings token rotation remains valid because it uses `/me/ingestion-tokens/{id}/rotate`.

관련 작업 노트: [[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]]



## 2026-05-31 Profile follow hydration and leaderboard resilience

> [!success]
> Profile follow controls now use Backend viewer state, and leaderboard rows are filtered before entering React render state.

문제:

- `/leaderboard`는 malformed row 하나가 `row.user.*` 또는 `row.main_metric.*` access에서 public page crash로 번질 수 있었습니다.
- `/profile/{username}` follow control은 profile response에 viewer follow state가 없어 stale default state로 시작했습니다.
- 자기 profile Follow button suppression과 follow mutation pending/error handling이 계약화되지 않았습니다.

수정:

- Backend `/v1/users/{username}` response에 authenticated viewer용 `viewer_state.following`을 추가했습니다.
- self profile은 `viewer_state.following=false`로 반환하고 follow lookup을 생략합니다.
- Frontend `safeLeaderboardItems()`가 usable identity와 `main_metric`이 있는 leaderboard row만 통과시킵니다.
- Frontend Profile page가 `profile.viewer_state?.following`으로 hydrate하고, 자기 profile에서는 follow control을 숨깁니다.
- Follow/unfollow 중복 클릭 lock, optimistic rollback, error message를 추가했습니다.

검증:

- Backend: targeted profile tests, full `pytest` 205 passed, `ruff`, `git diff --check`
- Frontend: `npm run lint`, `npm run test:contracts`, production `npm run build`, `git diff --check`
- Cross-repo: `make test` in `agentfeed-dev` passed

관련 작업 노트: [[Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31]]



## 2026-05-31 Settings named ingestion token creation 계약

> [!success]
> Frontend Settings가 Backend의 named ingestion token create API를 직접 사용해 새 CLI 기기 연결을 시작할 수 있게 했습니다.

문제:

- Backend에는 `POST /me/ingestion-tokens`가 있었지만 Frontend Settings는 list/rotate/revoke 중심이었습니다.
- 사용자는 Settings에서 새 이름의 token을 만들고 one-time secret을 복사하는 self-serve 경로가 없었습니다.
- token handoff 안내도 최신 stdin-first CLI 경로와 맞아야 했습니다.

수정:

- `me.createIngestionToken(name)` API client를 추가했습니다.
- Settings token section에 name input + create button을 추가했습니다.
- 생성 성공 시 token list를 refresh하고 one-time secret panel을 표시합니다.
- 생성/회전 secret panel은 같은 one-time reveal UX를 사용합니다.
- CLI handoff 안내는 `agentfeed login --token-stdin`를 사용합니다.

검증:

- `npm run test:contracts`
- `npm run lint`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build`
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31]]

## 2026-05-31 Dashboard recent worklog action route 계약

> [!success]
> Dashboard recent worklogs가 status와 무관하게 public detail route로 이동하던 UX를 Backend `action_url` 계약과 Frontend status-aware helper로 보강했습니다.

문제:

- `/me/dashboard/recent-worklogs`는 `id`, `title`, `status`, `created_at`만 반환했습니다.
- Frontend Dashboard는 모든 row를 `/worklogs/{id}`로 연결했습니다.
- `needs_review`, `draft`, `private` worklog는 사용자가 review/manage flow로 가야 하는데 public detail route로 먼저 이동할 수 있었습니다.

수정:

- Backend recent worklog row에 `action_url`을 추가했습니다.
- `public` / `unlisted`는 `/worklogs/{id}`로, 그 외 상태는 `/worklogs/{id}/review`로 연결합니다.
- Frontend는 `dashboardRecentWorklogHref()`를 통해 Backend action URL을 우선 사용합니다.
- Frontend helper는 외부/unsafe action URL을 거부하고 status 기반 fallback을 사용합니다.

검증:

- `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k dashboard_recent_worklogs`
- `uv run --python 3.12 --locked --group dev ruff check app/routers/me.py tests/test_contracts.py`
- `uv run --python 3.12 --locked --group dev pytest -q` → 201 passed
- `npm run test:contracts`
- `npm run lint`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build`
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Dashboard Recent Worklog Actions 2026-05-31]]

## 2026-05-31 Ingest repository URL safety

> [!success]
> CLI upload path뿐 아니라 direct ingestion API caller도 unsafe repository URL을 저장하지 못하도록 Backend schema boundary를 보강했습니다.

문제:

- 일반 project create/update schema는 public URL validator를 사용했습니다.
- ingestion schema의 `project.repository_url`은 같은 validator를 적용하지 않아 direct API caller가 `localhost`, private IP, credential-bearing URL을 저장할 수 있었습니다.

수정:

- `IngestProject.repository_url`에 `validate_public_http_url()`를 적용했습니다.
- blank value는 `None`으로 normalize합니다.
- 회귀 테스트가 unsafe/private/userinfo URL reject와 public GitHub URL accept를 고정합니다.

검증:

- `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'public_url_schemas or ingest'`
- `uv run --python 3.12 --locked --group dev ruff check app/schemas/ingestion.py tests/test_contracts.py`
- `uv run --python 3.12 --locked --group dev pytest -q` → 200 passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - Ingest Repository URL Safety 2026-05-31]]

## 2026-05-31 CLI token stdin login 계약

> [!success]
> CLI token handoff 문서와 runtime remediation을 stdin-first로 정렬해 raw token이 argv/history에 남는 경로를 줄였습니다.

수정:

- `agentfeed login --token-stdin`과 `agentfeed login --token -`를 추가했습니다.
- README quick start는 browser login 기본값을 사용합니다.
- token handoff 예시는 secret-manager/env token을 stdin으로 pipe하는 방식으로 변경했습니다.
- CI browser guard, preview/publish missing-token error, help text가 stdin-first remediation을 안내합니다.

검증:

- `npm test -- --run tests/cli-status-doctor.test.ts`
- `npm run typecheck`
- `npm test -- --run` → 234 passed
- `npm pack --dry-run` → passed
- `make test` in `agentfeed-dev` → passed

관련 작업 노트: [[Commercial Readiness Hardening - CLI Token Stdin Login 2026-05-31]]

## 2026-05-31 cross-repo readiness 후보 처리 상태

> [!success]
> Sidecar audit에서 남아 있던 cross-repo readiness 후보는 구현 노트로 이동했고, 현재 미처리 API/Frontend contract 후보는 없습니다.

- [x] Dashboard recent worklogs의 private/review 다음 행동 단절 → [[Commercial Readiness Hardening - Dashboard Recent Worklog Actions 2026-05-31]]
- [x] Frontend Settings named ingestion token create / one-time reveal UX → [[Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31]]
- [x] Backend/CLI token-authenticated self-rotation trust boundary → [[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]]

## 2026-05-31 Owner-aware project route 계약

> [!success]
> Project slug uniqueness가 owner scope인 DB 계약에 맞춰 Backend response와 Frontend links/detail lookup을 owner-aware route로 정렬했습니다.

문제:

- Backend는 `Project.slug`를 `(owner_id, slug)` 기준으로 unique하게 관리합니다.
- 기존 Frontend public link는 `/projects/{slug}`였고, ProjectDetail은 `/projects/{id}` 실패 후 paginated `/projects` scan으로 slug를 찾았습니다.
- 이 방식은 같은 slug를 가진 다른 owner가 생기면 ambiguous하고, pagination 범위 밖 프로젝트를 false 404로 처리할 수 있습니다.

수정:

- Backend `/v1/users/{username}/projects/{project_slug}` detail payload에 `project.owner`를 포함합니다.
- Backend search/explore project card에 `owner`를 포함합니다.
- Frontend는 owner를 알고 있는 project link를 `/projects/{owner}/{slug}`로 생성합니다.
- Frontend ProjectDetail은 owner route에서 `/v1/users/{owner}/projects/{slug}`를 직접 호출하고, legacy route는 id-only lookup으로 유지합니다.
- paginated project list scan fallback은 제거했습니다.

검증:

- Backend contract/full tests: 200 passed
- Frontend contract tests/typecheck/build: passed
- Cross-repo `agentfeed-dev make test`: passed

관련 작업 노트: [[Commercial Readiness Hardening - Owner Aware Project Routes 2026-05-31]]

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
- [x] smoke에서 token-authenticated self-rotation 403과 browser-approved replacement/old-token invalidation 검증
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
> [!warning] Superseded 2026-05-31
> 이 절의 “공개 메모” 표현은 폐기되었습니다. 현재 `user_note`는 생성 요약(`summary`)과 분리된 **owner review context**이며 public detail/feed/card에는 노출하지 않습니다.

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
- 같은 smoke에서 `POST /v1/ingest/token/rotate` 403 remediation, browser-approved `replace_token_id` exchange, old-token invalidation, replacement-token upload를 검증합니다.

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

## 2026-05-30 Search cursor pagination contract

> [!success]
> Backend `/v1/search` cursor contract와 Frontend `/search` Load more UX가 연결되었습니다.

계약:

- Backend는 `cursor` query param을 offset cursor로 decode하고 branch query에 적용합니다.
- Search query는 stable ordering을 갖고 `limit + 1` fetch로 `has_more`를 계산합니다.
- Response는 `{ data, pagination: { next_cursor, has_more } }` envelope을 유지합니다.
- Frontend `search.query()`는 pagination envelope을 반환하고 `/search`는 다음 cursor를 요청해 결과를 append합니다.

검증: [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30#검증 결과]]

## 2026-05-30 Settings token capture UX contract

> [!success]
> Frontend Settings rotation UX는 Backend one-time secret contract를 사용자 행동으로 안전하게 연결합니다.

계약:

- Backend rotation response의 `name`, `token`, `token_expires_at`/`expires_at` 필드를 그대로 사용합니다.
- 사용자는 copy button을 우선 사용하고, clipboard failure에서만 reveal fallback을 봅니다.
- Token panel lifecycle은 dismiss 또는 120초 timeout으로 종료됩니다.
- Panel이 열려 있는 동안 rotate/revoke button을 disable해 one-time secret handoff를 먼저 완료하게 합니다.

관련 구현: [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30]]

## 2026-05-30 Leaderboard cursor pagination contract

> [!success]
> Backend `/v1/leaderboard`의 `cursor` parameter가 실제 query와 Frontend Load more UX에 연결되었습니다.

계약:

- Response envelope은 `{ data: { type, period, items }, pagination: { next_cursor, has_more } }`입니다.
- Cursor는 `{ offset }` 기반이며 malformed cursor는 첫 페이지로 fallback합니다.
- Ranking은 metric desc + user id asc로 stable tie-breaker를 갖습니다.
- Frontend는 row index가 아니라 Backend `rank` 값을 표시해 추가 페이지에서도 global rank를 유지합니다.
- Auth next allowlist는 `/leaderboard`에서 `type`, `period`, `cursor`, `limit`만 보존합니다.

검증: [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30#검증 결과]]

## 2026-05-30 Project slug uniqueness and race safety

> [!success]
> Project slug source of truth를 DB partial unique index로 고정하고 Backend create/ingest race path가 같은 constraint로 수렴하도록 보강했습니다.

계약:

- Active project uniqueness는 `projects(owner_id, slug) WHERE deleted_at IS NULL`입니다.
- `POST /v1/projects`는 application precheck 뒤 DB unique race가 발생해도 slug suffix를 재시도합니다.
- Ingest auto-create는 duplicate race 시 rollback 후 existing active project를 다시 조회합니다.
- `/users/{username}/projects/{project_slug}`는 legacy duplicate가 있어도 deterministic first row를 반환합니다.

운영 주의:

> [!warning]
> 운영 DB에 active duplicate가 있으면 `009_project_slug_unique` migration은 merge를 요구하며 중단됩니다.

검증: [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30#검증 결과]]

관련 구현: [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30]]


## 2026-05-31 Discovery URL Adapter hardening

> [!success]
> CLI/Backend/Frontend 상용화 hardening 루프에서 discovery abuse, URL trust, adapter crash 리스크를 닫았습니다.

계약:

- CLI cached upload metadata와 `agentfeed open`은 trusted review URL만 사용합니다.
- Backend public discovery routes는 read-tier rate limit과 bounded search query를 갖습니다.
- Backend public profile/project URL fields는 http(s) + credential-free URL만 저장합니다.
- Frontend list adapters는 malformed API row를 drop하고 valid rows를 유지합니다.

검증: [[Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31#검증 결과]]

## 2026-05-31 Browser login API bounds security headers

> [!note]
> 이번 루프는 onboarding reliability, frontend runtime failure boundary, backend data-integrity contract를 함께 닫은 상용화 hardening입니다.

- CLI `publish --json` output shape: `{ draft_id, upload }`.
- Publish clipboard behavior now matches share unless `--no-clipboard` is set.
- Frontend auth state can recover from API 401 after initial page load.
- Backend no longer advertises unimplemented `team` visibility in write schemas; persisted values are constrained at DB level.

관련: [[Commercial Readiness Hardening - Browser Login API Bounds and Security Headers 2026-05-31]]

## 2026-05-31 Private preview and API host hardening

- CLI pre-auth login은 repo-local API discovery를 기본 ignore하고 Backend는 production Host allowlist를 강제한다.
- Backend public worklog payload와 Frontend adapter가 `user_note`를 public surface에서 제거해 Feed/Detail privacy contract를 맞췄다.
- Frontend review page는 unsafe preview 감지 시 publish를 차단하지만 Backend의 `safe_public_preview` contract가 있으면 public title/summary candidate를 정상 publish 가능 상태로 처리한다.

## 2026-05-31 Feed comments pagination and runtime recovery

- Frontend `/feed`는 backend `next_cursor` / `has_more`를 보존하고 추가 페이지를 append한다.
- Worklog comments도 backend cursor pagination을 사용한다.
- Route/global error boundary로 runtime failure 시 Feed 복귀/재시도 UX를 제공한다.
## 2026-05-31 Notification dedupe and frontend comment contracts

> [!success]
> Backend notification producer와 Frontend comments/API regression contract가 같은 상용화 기준으로 보강되었습니다.

Backend 계약:

- `notifications.dedupe_key`는 nullable unique index입니다.
- repeatable producer는 deterministic key를 넘기고 DB `ON CONFLICT DO NOTHING`으로 중복 발행을 흡수합니다.
- publish/follow/like/bookmark/comment producer가 dedupe contract를 사용합니다.

Frontend 계약:

- Dashboard는 summary/recent worklog partial failure를 분리합니다.
- Worklog detail은 primary worklog fetch와 secondary comments fetch를 분리합니다.
- Initial/load-more/submitted comments는 모두 id 기반 dedupe helper를 거칩니다.
- Projects/search/leaderboard/me pagination/action URL contract가 no-dependency test로 잠겼습니다.

검증: [[Commercial Readiness Hardening - Session Parser Bounds Notification Dedupe and Comment Contracts 2026-05-31#검증 증거]]
## 2026-05-31 Notification settings gate and social action contracts

> [!success]
> Backend notification dedupe insert는 사용자 설정 gate 뒤에서만 실행되고, Frontend optimistic social actions는 pure helper contract로 회귀 방어됩니다.

Backend 계약:

- Notification setting이 disabled이면 `dedupe_key`가 있어도 insert를 시도하지 않습니다.
- `015_notification_dedupe_key` migration은 nullable column + unique index + downgrade drop을 유지해야 합니다.

Frontend 계약:

- Auth loading 상태는 action을 대기시킵니다.
- Signed-out 상태는 GitHub auth funnel로 보냅니다.
- Pending item은 중복 action을 차단합니다.
- API failure는 optimistic state를 이전 값으로 rollback합니다.
- Settled request는 pending state를 해제합니다.

검증: [[Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31#검증 증거]]

## 2026-05-31 Concurrent notification migration and Header contracts

> [!success]
> Notification dedupe schema change는 운영 online migration lock을 줄이면서도 기존 offline SQL chain과 dev integration gate를 유지합니다.

Backend 계약:

- `notifications.dedupe_key` unique index는 online migration에서 `postgresql_concurrently=True`로 생성됩니다.
- Alembic offline SQL mode는 transactional script와 호환되도록 plain unique index를 출력합니다.
- downgrade도 offline/online branch를 mirror 처리합니다.

CLI 계약:

- Browser login happy-path UX는 credential-free fake auth server test로 고정합니다.
- CI guard는 browser session API를 호출하지 않는 fail-fast 경로여야 합니다.

Frontend 계약:

- Header nav link set과 search href는 pure helper contract로 고정합니다.
- Active route matching은 slash boundary를 사용해 `/projects-old` 같은 sibling path를 `/projects` active로 오인하지 않습니다.

검증: [[Commercial Readiness Hardening - Concurrent Notification Migration CLI Auth Smoke and Header Contracts 2026-05-31#검증 증거]]


## 2026-05-31 Settings partial failure and cross-platform open contracts

> [!success]
> CLI review 재열기, Backend deployment config, Frontend settings UX가 상용화 기준의 failure isolation contract로 맞춰졌습니다.

CLI 계약:

- `agentfeed open`은 trusted cached review URL만 열고, Windows opener command를 platform-native로 실행합니다.
- README/help는 review draft 재열기 command를 명시합니다.

Backend 계약:

- Host allowlist와 trusted proxy 설정은 startup에서 형식 오류를 fail-fast합니다.
- 잘못된 `API_ALLOWED_HOSTS` token은 TrustedHostMiddleware에 전달되기 전에 차단됩니다.

Frontend 계약:

- Settings primary data(`me.settings`)와 secondary data(integrations/tokens)는 `Promise.allSettled`로 분리됩니다.
- integrations/tokens 장애는 section-level alert로 표시하고 privacy/notification controls를 blank 처리하지 않습니다.

검증: [[Commercial Readiness Hardening - Cross Platform Open Config Validation and Settings Partial Failure 2026-05-31#검증 증거]]


## 2026-05-31 Aggregate feed keyset and OAuth hash redirect

> [!success]
> Feed pagination 안정성과 OAuth redirect 복귀 위치가 상용화 기준으로 보강되었습니다.

Backend 계약:

- `/v1/feed`와 `/v1/feed/following`의 `most_liked`, `most_discussed`, `trending` sort는 더 이상 offset cursor를 사용하지 않습니다.
- Aggregate cursor는 `score`, `published_at`, `id`를 포함합니다.
- Aggregate order와 cursor predicate는 `score DESC`, `published_at DESC`, `id DESC` 순서로 맞춥니다.
- `latest` / `most_shipped`도 `published_at DESC`, `id DESC` tie-breaker를 사용합니다.

Frontend 계약:

- OAuth next allowlist는 safe hash fragment를 보존하고 unsafe hash를 strip합니다.
- Header sign-in UX와 forced auth redirect helper가 같은 hash-aware next builder를 사용합니다.
- Docs page는 실제 CLI command인 `agentfeed share --open-review`만 안내합니다.

검증: [[Commercial Readiness Hardening - Feed Keyset and OAuth Hash Redirect 2026-05-31#검증 증거]]

## 2026-05-31 CLI private review privacy policy

> [!success]
> CLI → Backend ingest → Frontend review flow의 publish 용어 혼동을 줄였습니다.

정합성:

- CLI `publish/share`는 `POST /v1/ingest/worklogs`에 private review draft를 업로드합니다.
- Backend `POST /v1/worklogs/{id}/publish`는 unresolved high-severity privacy finding이 있으면 public/unlisted publish를 거부합니다.
- Frontend review 화면은 이 차단을 해제하기 위해 privacy finding resolve flow를 제공합니다.
- CLI JSON automation은 `privacy_policy` 필드로 review 필요 여부를 판단할 수 있습니다.

관련 구현: [[Commercial Readiness Hardening - CLI Private Review Privacy Policy 2026-05-31]]

## 2026-05-31 Smoke user_note privacy contract

> [!success]
> `agentfeed-dev` smoke gate가 현재 `user_note` privacy boundary를 검증하도록 보정했습니다.

계약:

- CLI `share --note`는 draft/upload payload와 Backend review API의 `worklog.user_note`에는 보존됩니다.
- Backend public detail/feed/card payload는 `user_note: None`을 반환하고 raw note 문자열을 포함하지 않습니다.
- Frontend public adapter도 `user_note`를 public rendering model에 매핑하지 않습니다.
- `scripts/smoke-e2e.sh`는 review 단계에서는 note 보존을, public detail/feed 단계에서는 note 비노출을 검증합니다.

관련 구현: [[Commercial Readiness Hardening - Smoke User Note Privacy Contract 2026-05-31]]


## 2026-05-31 CLI auth publish privacy smoke and Alembic version gate

> [!success]
> `make smoke-e2e`가 CLI auth session token exchange부터 privacy block/resolve/publish/feed까지 live dev stack에서 통과했습니다.

통합 계약:

- CLI auth session create/approve/exchange가 `authorize_url` query shape와 one-time ingestion token 발급을 보장합니다.
- Smoke upload는 browser-login exchange로 받은 ingestion token을 사용해 실제 CLI upload 경로와 연결됩니다.
- Backend publish는 unresolved blocking privacy finding을 422 `UNRESOLVED_PRIVACY_FINDING`으로 거부하고 finding id를 반환합니다.
- Resolve API 이후 Review API는 stale `privacy_scan_json`이 아니라 fresh row 상태를 보여주며, publish 재시도는 성공합니다.
- Alembic `011_visibility_status_constraints`는 긴 revision id chain을 위해 `alembic_version.version_num`을 64자로 확장합니다.

검증: [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31#검증 증거]]

## 2026-05-31 Hydrated browser public DOM smoke

> [!success]
> CLI upload → Backend publish → Frontend public rendering 흐름이 실제 headless browser DOM까지 이어지는지 smoke gate에 포함했습니다.

통합 계약:

- Dev smoke는 Chrome/Chromium DevTools protocol로 `/worklogs/{id}`와 `/feed`를 렌더링합니다.
- DOM polling은 dynamic worklog title/agent/model positive assertion으로 API fetch와 hydration 완료를 확인합니다.
- 같은 DOM에서 `Smoke author note` 비노출을 확인해 public UI privacy regression을 잡습니다.
- 새 npm dependency 없이 Node built-in WebSocket과 Chrome DevTools Protocol만 사용합니다.

검증: [[Commercial Readiness Hardening - Hydrated Browser Privacy Smoke 2026-05-31#검증 증거]]

## 2026-05-31 Settings privacy controls

> [!success]
> Backend privacy settings contract에 있는 default visibility와 public metric toggles가 Frontend Settings UI에 노출되었습니다.

계약:

- `default_worklog_visibility`, `default_project_visibility`는 Settings select로 조작합니다.
- `show_estimated_cost_publicly`, `show_file_count_publicly`, `show_line_count_publicly`, `show_test_count_publicly`는 Settings toggle로 조작합니다.
- Frontend source contract가 해당 field들의 SettingsPage 렌더/save 경로를 고정합니다.

검증: [[Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31#검증 증거]]

## 2026-05-31 Sign-out social state reset

> [!success]
> Frontend sign-out이 auth-scoped optimistic social state와 pending refs를 초기화합니다.

계약:

- sign-out 후 `likes`, `bookmarks`, `likePending`, `bookmarkPending`은 빈 state가 됩니다.
- pending refs도 빈 object로 갱신해 다음 로그인 사용자의 action guard에 stale id가 남지 않습니다.
- stale social action error banner도 sign-out 시 제거합니다.

검증: [[Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31#검증 증거]]

## 2026-05-31 Frontend detail and review payload resilience

> [!success]
> Frontend 단일 detail/review object 경로가 partial/malformed API payload를 렌더 crash 대신 error fallback/fail-closed publish guard로 처리합니다.

계약:

- Worklog detail adapter는 unusable payload를 명시 error로 거부합니다.
- Review page는 nested `worklog`/`preview` payload를 렌더링 전 검증합니다.
- malformed privacy finding severity는 blocking으로 처리합니다.
- `preview.public_fields`는 string list로 normalize합니다.

검증: [[Commercial Readiness Hardening - Rate Limit Fallback Detail Payload Resilience and Credential Fallback Warning 2026-05-31#검증 증거]]


## 2026-05-31 High-traffic response model first slice

> [!success]
> Backend high-traffic auth/settings/health route의 response model metadata를 고정해 Frontend/CLI가 기대하는 shape를 OpenAPI와 contract test에서 확인할 수 있게 했습니다.

계약:

- `/health` → `HealthResponse`
- `/v1/auth/me` → `DataResponse[AuthMeResponse]`
- `/v1/me/settings*` → `DataResponse[UserSettingsResponse]`
- `AuthMeResponse.location`을 포함해 Frontend `ApiAuthMe`와 auth profile field를 정렬합니다.

검증: [[Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31#검증 증거]]

## 2026-05-31 CLI share JSON side-effect contract

> [!success]
> `agentfeed share --json`은 자동화 출력 모드이므로 기본적으로 stdout JSON 외 side effect를 만들지 않습니다.

계약:

- 기본 `share --json`은 clipboard/browser opener를 호출하지 않습니다.
- `--clipboard`와 `--open-review`가 명시될 때만 해당 side effect가 발생합니다.
- upload 실패 시 명시 flag가 있어도 side effect를 실행하지 않습니다.

검증: [[Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31#검증 증거]]


## 2026-05-31 Public discovery and interaction response models

> [!success]
> Frontend가 직접 소비하는 public feed/discovery/social/comment route에 response model contract를 부여했습니다.

계약:

- Public card list routes는 `ListResponse[WorklogCard]`를 사용합니다.
- Tags/search suggestions는 `DataResponse[list[TagItem]]`, `DataResponse[list[SearchSuggestion]]`를 사용합니다.
- Like/bookmark는 `DataResponse[LikeResponse]`, `DataResponse[BookmarkResponse]`를 사용합니다.
- Comments는 `ListResponse[Comment]` / `DataResponse[Comment]`를 사용합니다.
- Report mutation은 `OkResponse`를 사용합니다.
- `WorklogCard` schema는 실제 Backend card builder와 같은 public fields를 가져야 합니다.

검증: [[Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31#검증 증거]]

## 2026-05-31 User dashboard worklog response model contract

> [!success]
> Backend user/profile/dashboard/worklog 핵심 route가 OpenAPI와 contract test에서 명시 response model을 갖도록 보강했습니다.

계약:

- User profile/follow/worklog list route는 `PublicUser`, `FollowResponse`, `WorklogCard` schema로 고정합니다.
- Me dashboard route는 `DashboardSummaryResponse`와 `DashboardRecentWorklog`로 고정합니다.
- Worklog create/detail/update/delete/review/privacy-finding/publish/unpublish route는 전용 response schema 또는 `OkResponse`로 고정합니다.
- Worklog detail schema는 `social` / `viewer_state`를 포함해 response model filtering으로 Frontend state가 사라지지 않게 합니다.
- Project family와 activity histogram은 shape 설계가 더 필요한 별도 slice로 남겼습니다.

검증: [[Commercial Readiness Hardening - User Dashboard Worklog Contracts and Collect JSON Stability 2026-05-31#검증 증거]]

## 2026-05-31 Full JSON API response model contract

> [!success]
> Frontend/CLI가 소비하는 일반 JSON `/v1` route는 redirect 및 deprecated disabled endpoint를 제외하고 모두 `response_model`을 갖습니다.

계약:

- Project, user project/activity, search, explore, notifications, integrations, auth CLI session, ingest response에 전용 schema를 추가했습니다.
- Project stats는 Backend 실제 반환 key인 `worklog_count`, `total_files`, `total_lines_added`, `total_lines_removed`, `total_tests`, `total_commits`, `contributor_count`를 기준으로 정렬했습니다.
- Notification target은 `extra=allow`를 유지해 `username` 같은 frontend navigation payload가 response filtering으로 사라지지 않게 합니다.
- 의도적 예외는 OAuth redirect 2개와 deprecated 403-only ingestion token rotate endpoint뿐입니다.

검증: [[Commercial Readiness Hardening - Full JSON API Response Contract 2026-05-31#검증 증거]]
