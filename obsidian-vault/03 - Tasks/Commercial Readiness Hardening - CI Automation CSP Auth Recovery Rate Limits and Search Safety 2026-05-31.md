---
title: Commercial Readiness Hardening - CI Automation CSP Auth Recovery Rate Limits and Search Safety 2026-05-31
aliases:
  - 2026-05-31 CI CSP Auth Recovery Hardening
  - CI Automation CSP and Search Safety
created: 2026-05-31
tags:
  - agentfeed/readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/security
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - CI Automation CSP Auth Recovery Rate Limits and Search Safety 2026-05-31

> [!important] 목표
> Claude/Gemini 외부 리뷰에서 남은 P1/P2 후보를 상용화 기준으로 닫았습니다. 핵심은 **CLI automation side effect 제거**, **공개/인증 API abuse boundary 보강**, **Frontend CSP 및 auth outage 복구 UX**입니다.

## 배경

- CLI `login`은 `AGENTFEED_CI`만 CI로 인식해 GitHub Actions/일반 `CI=true` 환경에서 browser login이 걸릴 수 있었습니다.
- CLI `share --json` / `publish --json`은 자동화 출력임에도 기본 clipboard side effect가 남아 있었습니다.
- CLI option parser는 `--token --no-save` 같은 flag를 값으로 받아 잘못된 인증 흐름을 만들 수 있었습니다.
- SCP/SSH Git remote는 public-safe URL이 아니지만 upload payload에 host/org/repo 정보가 섞일 여지가 있었습니다.
- Backend read/auth helper route 일부는 rate-limit coverage가 부족했고 `/v1/users/check-username` static path가 dynamic username bucket으로 shadowing될 수 있었습니다.
- Backend public URL fields는 local/private host URL 저장을 막지 못했고 search wildcard-only query는 broad enumeration으로 이어질 수 있었습니다.
- Frontend는 `script-src 'unsafe-inline'` CSP와 `/auth/me` 장애를 signed-out으로 오인하는 OAuth loop 위험이 있었습니다.
- Frontend GET request가 `Content-Type: application/json`을 보내 불필요한 CORS preflight를 유발할 수 있었습니다.

## 구현 요약

### CLI

- CI 감지 env를 `AGENTFEED_CI`, `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `BUILDKITE`, `CIRCLECI`, `JENKINS_URL`, `TF_BUILD`, `TEAMCITY_VERSION`, `VERCEL`, `NETLIFY`로 확장했습니다.
- CI 환경에서 token이 없고 `--browser` override가 없으면 browser auth를 즉시 차단합니다.
- `option()` parser가 missing/empty/flag-like value를 에러로 처리합니다.
- `share --json` / `publish --json`은 clipboard를 기본 비활성화하고, `--clipboard`일 때만 복사합니다.
- non-HTTP(S) Git remote는 upload payload에서 `null`로 생략합니다.
- local draft에는 `[[Privacy Safety]]` 추적을 위해 `[REDACTED_URL]` placeholder를 보존하지만 upload payload는 `null`로 보냅니다.

### Backend

- `/v1/auth/me`, `/v1/me/*`, `/v1/ingest/status`, `/v1/integrations/{type}/setup-guide` read/helper routes에 rate-limit rule을 추가했습니다.
- static rate-limit path를 먼저 매칭해 `/v1/users/check-username`이 `/v1/users/{username}` bucket으로 잘못 정규화되지 않게 했습니다.
- public URL validation이 `localhost`, `.localhost`, `.local`, loopback/private/link-local/non-global IP host를 거부합니다.
- search query는 wildcard-only/non-alphanumeric input을 422로 거부합니다.
- SQL `ILIKE` 검색 패턴에서 `%`, `_`, `\`를 escape하고 `ESCAPE '\'`를 적용했습니다.

### Frontend

- static security headers에서 CSP를 제거하고 middleware가 per-request nonce CSP를 생성하도록 바꿨습니다.
- Root layout inline theme bootstrap script에 middleware `x-nonce`를 전달합니다.
- `script-src`에서 arbitrary `'unsafe-inline'`을 제거하고 nonce + `strict-dynamic` 기반으로 전환했습니다.
- `/auth/me` 실패를 auth failure와 network/backend failure로 구분합니다.
- backend/network auth 상태 확인 실패 시 OAuth redirect loop 대신 `AuthUnavailableBanner`를 보여줍니다.
- Dashboard/Settings/Notifications/WorklogReview 보호 페이지는 `authError` 동안 자동 로그인 이동을 멈춥니다.
- API client는 GET/HEAD without body 요청에 `Content-Type`을 붙이지 않고, JSON body 요청에만 기본 `application/json`을 붙입니다.

> [!warning] 계약
> Machine-readable CLI mode는 명시 opt-in 없는 side effect를 만들면 안 됩니다. `--json`은 스크립트 표면이고 clipboard/open-browser는 별도 사용자 의도여야 합니다.

> [!tip] Frontend CSP 메모
> nonce 기반 CSP는 request별 동적 렌더링과 header 전달이 전제입니다. `src/middleware.ts`가 `x-nonce`와 `Content-Security-Policy`를 request/response 양쪽에 설정하고, `src/app/layout.tsx`가 nonce를 읽어 inline bootstrap script에 전달합니다.

## 검증 결과

> [!success] Gate 통과
> 3개 레포 개별 gate와 `agentfeed-dev` 통합 `make test`가 모두 통과했습니다.

- CLI: `npm run typecheck && npm test -- --run` → 19 files / 209 tests passed
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed, production build successful
- Backend: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 160 passed, 1 known Starlette deprecation warning
- Integration: `make test` in `agentfeed-dev` → passed; includes CLI `prepack`, frontend production build, backend ruff/pytest, Alembic offline migration chain to `011_visibility_status_constraints`
- Diff hygiene: `git diff --check` across CLI/Frontend/Backend → passed

## 남은 리스크

- Browser-level CSP violation console은 deployed CDN/header 조합에서 별도 smoke가 필요합니다.
- Browser JWT server-side revocation은 이번 패스에서 보류된 P2입니다.
- Search/rate-limit은 단일 프로세스 테스트로 검증했으며 production distributed pressure test는 별도 필요합니다.

## 관련 링크

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Privacy Safety]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31]]
