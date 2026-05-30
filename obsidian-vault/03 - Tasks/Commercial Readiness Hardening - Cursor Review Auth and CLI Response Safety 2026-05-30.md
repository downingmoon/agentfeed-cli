---
title: Commercial Readiness Hardening - Cursor Review Auth and CLI Response Safety 2026-05-30
aliases:
  - Cursor Review Auth CLI Response Safety
  - 2026-05-30 Cursor Review Auth CLI Safety P1
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Cursor Review Auth and CLI Response Safety 2026-05-30

> [!important] 목표
> 세 레포의 다음 P1 상용화 gap을 닫았습니다: Backend keyset cursor 500 방지, profile project pagination 계약 연결, Frontend review/auth UX 방어, CLI upload response/credential 복구 안전성.

## 배경

병렬 audit에서 다음 문제가 확인되었습니다.

- 여러 Backend list endpoint가 cursor payload를 직접 index access하거나 `datetime.fromisoformat()` / `uuid.UUID()`를 직접 호출해 malformed cursor에서 500이 날 수 있었습니다.
- `/users/{username}/projects`는 `limit`만 받고 실제 `cursor` pagination을 반환하지 않아 Frontend profile projects tab과 계약이 불완전했습니다.
- Frontend profile follow와 worklog review route는 비로그인 사용자를 명확히 OAuth로 보내지 못하거나, review fetch 실패 시 비어 있는 review UI를 보여줄 수 있었습니다.
- Notification follower link가 user UUID 기반 `/profile/{id}`로 갈 수 있어 username route와 맞지 않았습니다.
- CLI upload response parser가 `visibility === private`에만 고정되어 Backend가 `unlisted/public/team` 같은 합법 visibility를 반환하면 실패할 수 있었고, `review_url` 검증은 query/hash/API host를 충분히 거르지 못했습니다.
- `~/.agentfeed/credentials.json`이 깨지면 env token이 있어도 CLI가 시작 전 crash할 수 있었습니다.

## 변경 범위

- [[Integration - CLI Backend Frontend#2026-05-30 Cursor pagination hardening|Cursor pagination hardening]]
- [[Integration - CLI Backend Frontend#2026-05-30 Profile projects pagination contract|Profile projects pagination contract]]
- [[Auth & Credential Safety#2026-05-30 Review route auth gate|Review route auth gate]]
- [[Auth & Credential Safety#2026-05-30 CLI malformed credentials recovery|CLI malformed credentials recovery]]
- [[Runtime Configuration#2026-05-30 CLI upload response validation|CLI upload response validation]]

## 구현 요약

### Backend

- `app/utils/cursor.py`에 `decode_datetime_id_cursor(token, datetime_key)` helper를 추가했습니다.
- feed/following/project/user/me/bookmark/notification/comment/explore category keyset cursor를 helper 기반으로 교체해 malformed/partial cursor를 첫 페이지 fallback으로 처리합니다.
- `/users/{username}/projects`에 `cursor` query parameter, `limit + 1`, `updated_at + id` cursor, stable order를 추가했습니다.
- cursor helper와 주요 keyset list endpoint의 malformed cursor regression test를 추가했습니다.
- user profile projects pagination metadata regression test를 추가했습니다.

### Frontend

- `users.projects(username, { cursor, limit })` API client를 추가하고 `ProfilePage` projects tab에 Load more/error/empty state를 연결했습니다.
- `AppContext`에 현재 route를 보존하는 sign-in redirect helper를 공개하고, profile follow action과 review route에서 사용했습니다.
- `WorklogReviewPage`는 로그인 상태 확인 후 review API를 호출하고, unauthenticated 사용자를 OAuth로 보내며, review fetch 실패 시 빈 publish UI 대신 recoverable error card를 렌더합니다.
- follower notification link 계산을 `src/lib/notifications.ts`로 분리하고 target/actor username 기반 `/profile/{username}`만 허용합니다.
- OAuth next 계약에 `/worklogs/{id}/review` deep route preservation을 추가했습니다.

### CLI

- upload result visibility type을 공용 `Visibility` union으로 확장하고 합법 visibility set을 검증합니다.
- review URL은 username/password, query/hash, 예상 path 외 route, `api.*.agentfeed.dev` review host, custom API와 다른 host를 거부합니다.
- local dev API에서는 local frontend host만 허용해 `localhost:8001` → `localhost:3001` 흐름은 유지합니다.
- malformed credentials file은 warning으로 격리하고, env token이 있으면 그대로 사용할 수 있게 했습니다.

## 계약

> [!warning] Cursor 실패 정책
> Malformed cursor는 4xx가 아니라 첫 페이지 fallback으로 처리합니다. 이 정책은 기존 leaderboard/search offset cursor 정책과 맞춘 UX 안정성 우선 계약입니다.

> [!note] Profile projects cursor
> `/users/{username}/projects` cursor source of truth는 `Project.updated_at DESC, Project.id DESC`입니다. Frontend는 `pagination.next_cursor`만 전달하고 cursor 내부 구조를 해석하지 않습니다.

> [!warning] CLI review URL trust boundary
> CLI는 Backend upload/duplicate response의 `review_url`도 신뢰하지 않고 재검증합니다. Production AgentFeed API는 `agentfeed.dev` 계열 non-API host의 `/review/{id}` 또는 `/worklogs/{id}/review`만 허용합니다.

## 검증 결과

> [!success] 통합 gate 통과
> 세 레포 개별 gate와 `agentfeed-dev make test`가 모두 통과했습니다.

- CLI:
  - `npm test -- tests/api-hook.test.ts tests/config.test.ts` → 48 passed
  - `npm test` → 174 passed
- Backend:
  - `uv run --python 3.12 --locked --group dev ruff check app/utils/cursor.py app/routers/feed.py app/routers/projects.py app/routers/users.py app/routers/me.py app/routers/notifications.py app/routers/worklogs.py app/routers/explore.py tests/test_contracts.py`
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'decode_datetime_id_cursor or keyset_list_endpoints or user_projects'` → 3 passed
  - `uv run --python 3.12 --locked --group dev pytest -q` → 138 passed
- Frontend:
  - `npm run test:contracts && npm run lint`
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- Integration:
  - `make test` in `agentfeed-dev` → passed, including CLI pack dry-run, frontend build, backend ruff/pytest, Alembic offline migration chain.

## 남은 리스크

- Cursor malformed fallback은 UX 안정성에는 좋지만, 악성 반복 요청을 줄이려면 API gateway/rate limit telemetry와 함께 cursor invalid counter를 추가할 수 있습니다.
- Custom production API host는 review host를 같은 hostname으로 제한했습니다. 향후 white-label 배포에서 API host와 Frontend host를 분리하려면 signed frontend origin config가 필요합니다.
- Review route owner/Forbidden 처리는 Backend에서 강제되고 Frontend는 안전한 error card를 보여줍니다. 세분화된 403/404 메시지는 별도 UX scope입니다.

## 관련 링크

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30]]
