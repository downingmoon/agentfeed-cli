---
title: Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31
aliases:
  - Public Interaction Response Models
  - 2026-05-31 Discovery Feed Social Response Models
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/integration
  - hardening
status: verified
created: 2026-05-31
---

# Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31

관련: [[AgentFeed CLI MOC]], [[Integration - CLI Backend Frontend]], [[Active Tasks]]

> [!abstract] 목표
> 직전 route metadata first slice 이후 남은 high-value public/discovery/interaction API의 machine-readable contract를 더 넓혔습니다. 이번 변경은 응답 business logic을 바꾸지 않고 기존 반환 shape에 맞는 `response_model`을 부여해 Frontend/CLI 소비자가 의존하는 envelope를 OpenAPI와 contract test에서 고정합니다.

## 수정 범위

### Backend — public discovery/feed response model

> [!success]
> public feed와 discovery helper route가 이제 `ListResponse`/`DataResponse` 기반 schema contract를 갖습니다.

계약:

- `/v1/feed` → `ListResponse[WorklogCard]`
- `/v1/feed/following` → `ListResponse[WorklogCard]`
- `/v1/explore/categories/{slug}/worklogs` → `ListResponse[WorklogCard]`
- `/v1/tags` → `DataResponse[list[TagItem]]`
- `/v1/search/suggestions` → `DataResponse[list[SearchSuggestion]]`
- `WorklogCard` schema는 실제 card payload의 `status`, `changed_areas`, `public_prompt`를 포함합니다.
- `ProjectSummary.slug`는 private/deleted project placeholder를 위해 nullable로 정렬했습니다.

### Backend — social/comment interaction response model

> [!success]
> 사용자가 가장 많이 누르는 like/bookmark/comment/report API도 envelope contract를 노출합니다.

계약:

- `POST/DELETE /v1/worklogs/{worklog_id}/like` → `DataResponse[LikeResponse]`
- `POST/DELETE /v1/worklogs/{worklog_id}/bookmark` → `DataResponse[BookmarkResponse]`
- `GET /v1/worklogs/{worklog_id}/comments` → `ListResponse[Comment]`
- `POST /v1/worklogs/{worklog_id}/comments` → `DataResponse[Comment]`
- `POST /v1/comments/{comment_id}/report` → `OkResponse`
- `POST /v1/worklogs/{worklog_id}/report` → `OkResponse`

## 병렬 evidence lane 결과

- CLI malformed `file://` URI decode crash 리스크는 이미 `normalizedGenericPath()` try/catch와 regression test로 닫혀 있음을 확인했습니다.
- CLI `collect --json --upload`는 실제 upload를 수행하고 draft-level `upload` metadata를 반환하는 regression이 존재함을 확인했습니다.
- Frontend `auth.me()` nullable contract의 unsafe callsite는 현재 남아 있지 않고, AppContext/CLI authorize page 모두 null-safe임을 확인했습니다.

## 검증 증거

- Backend targeted: `.venv/bin/pytest tests/test_contracts.py -q -k "public_discovery_routes_have_response_models or social_and_comment_routes_have_response_models or high_traffic_routes_have_response_models"` → 3 passed
- Backend full: `.venv/bin/pytest -q` → 211 passed, 1 warning
- Backend lint: `.venv/bin/ruff check app/routers/explore.py app/routers/feed.py app/routers/search.py app/routers/social.py app/routers/tags.py app/routers/worklogs.py app/schemas/discovery.py app/schemas/project.py app/schemas/worklog.py tests/test_contracts.py` → passed
- CLI evidence: `npm run test -- tests/session-collector.test.ts && npm run test -- tests/cli-collect.test.ts` → 57 + 5 passed
- CLI sanity: `npm run typecheck` → passed
- Frontend evidence: `npm run test:contracts && npm run lint` → passed

## 남은 상용화 후보

> [!warning]
> 전체 상용화 목표는 계속 active입니다. 이번 루프는 route contract coverage를 확장했지만 아직 모든 Backend route가 response model을 가진 것은 아닙니다.

- `/v1/worklogs/*` create/update/publish/review, `/v1/projects/*`, `/v1/users/*`, `/v1/me/dashboard*` response model 확대.
- `collect --json --upload`도 `share --json`처럼 top-level `upload`를 추가할지 CLI JSON contract를 별도 결정.
- 실제 dev stack smoke 재실행으로 OpenAPI metadata 확장과 runtime serialization이 live route에서 문제 없는지 확인.

## 연결되는 계약

- [[Integration - CLI Backend Frontend#2026-05-31 Public discovery and interaction response models]]
