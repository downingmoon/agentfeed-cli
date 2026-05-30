---
title: Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31
aliases:
  - 2026-05-31 Discovery URL Adapter Hardening
  - Public Discovery Rate Limits and Adapter Resilience
created: 2026-05-31
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/security
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Discovery Rate Limits URL Safety and Adapter Resilience 2026-05-31

> [!important] 목표
> CLI, Backend, Frontend의 추가 P1/P2 상용화 리스크를 닫았습니다. 핵심은 **repo-local trust boundary**, **public discovery abuse 방어**, **stored URL safety**, **malformed API row resilience**입니다.

## 배경

- CLI는 인증 token이 있는 상태에서도 repo-local `.env` / `BACKEND_PORT`로 API base를 자동 발견할 수 있어, cloned repo가 bearer-token 요청을 local API로 유도할 수 있었습니다.
- CLI는 이미 업로드된 draft의 cached `review_url`을 재검증 없이 `publish/open`에서 재사용할 수 있었습니다.
- Backend public discovery/search 계열은 read-tier rate limit과 검색어 길이 제한이 부족해 broad wildcard scan abuse 여지가 있었습니다.
- Backend profile/project URL 필드는 `javascript:`/`data:`/userinfo URL을 저장 후 public payload로 재노출할 수 있었습니다.
- Frontend list adapter는 한 개 malformed row 때문에 feed/search/explore/profile/project 페이지 전체가 blank/crash 될 수 있었습니다.

## 구현 요약

### CLI

- 인증 token이 존재할 때 `api_base_url_source=env_file`이면 기본 production API로 fail-closed합니다.
- local repo `.env` API base를 인증 요청에 쓰려면 `AGENTFEED_TRUST_REPO_API_BASE=1` opt-in이 필요합니다.
- `publishDraft()`는 cached uploaded draft metadata도 fresh upload response와 동일한 review URL validator로 검증합니다.
- cached `review_url`이 invalid면 upload metadata를 clear하고 `DRAFT_UPLOAD_METADATA_INVALID`로 중단합니다.
- `agentfeed open`도 browser opener 호출 전에 현재/default API 기준 trusted review URL만 허용합니다.
- upload success response는 private-review states만 성공으로 인정합니다.

### Backend

- public discovery/read endpoints에 GET rate-limit rules를 추가했습니다: search, suggestions, feed, leaderboard, explore, tags, projects, users, worklogs/comments.
- dynamic path normalization을 users/explore categories까지 확장했습니다.
- `/search`와 `/search/suggestions`는 검색어 trim 후 2~120자만 허용해 one-character wildcard scan을 차단합니다.
- profile/project public URL fields는 http/https만 허용하고 URL userinfo를 거부합니다.
- `github_url`은 GitHub host, `x_url`은 X/Twitter host만 허용합니다.
- follow/like/bookmark mutation은 unique race를 idempotent success로 처리하고 rollback 후 current count를 반환합니다.
- self-follow는 422 validation error로 차단하고 DB check constraint + Alembic migration을 추가했습니다.

### Frontend

- `adaptWorklogCards`, `adaptUsers`, `adaptProjectSummaries` list adapters를 추가해 malformed row를 drop하고 valid row를 유지합니다.
- Feed/Search/Explore/Profile/Projects/ProjectDetail list boundaries에서 safe list adapters를 사용합니다.
- Project detail stats missing, worklog outcome/timeline malformed child rows, comment list malformed rows를 방어합니다.
- Search project/prompt rendering도 adapted/safe rows 기준으로 렌더링합니다.

> [!warning] Trust boundary
> repo-local `.env`는 편의 기능이지만 인증 token의 trust root가 아닙니다. 인증 요청은 explicit env var, stored credentials, default production API만 기본 신뢰하고, repo-local API base는 opt-in이어야 합니다.

## 검증 결과

> [!success] Gate 통과
> 세 레포 targeted/full gate와 통합 `make test`가 통과했습니다.

- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → passed
- CLI targeted: `npm test -- --run tests/config.test.ts tests/api-hook.test.ts tests/cli-share.test.ts` → 65 passed
- CLI full: `npm run typecheck && npm test -- --run` → 190 passed
- Backend targeted: `PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q tests/test_contracts.py` → 141 passed
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 154 passed
- Integration: `make test` in `agentfeed-dev` → passed, including CLI `prepack`, frontend production build, backend ruff/pytest, Alembic offline migration chain to `010_follow_no_self_constraint`

## 계약

- Authenticated CLI requests must not use repo-local discovered API base unless `AGENTFEED_TRUST_REPO_API_BASE=1` is explicit.
- Cached upload metadata is untrusted input and must pass the same review URL trust check as fresh API responses.
- Upload success means private review draft only until a future explicit publish/visibility flag exists.
- Public discovery routes must have read-tier rate limits and bounded search input.
- Public URL fields must be http(s), credential-free, and service-host constrained where applicable.
- Frontend list surfaces must isolate malformed API rows instead of blanking an entire page.

## 관련 링크

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Privacy Safety]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Soft Delete Auth Intent and CLI Upload Safety 2026-05-30]]
