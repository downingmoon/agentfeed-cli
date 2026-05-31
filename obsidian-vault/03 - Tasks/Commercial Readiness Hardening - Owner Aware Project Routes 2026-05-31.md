---
title: Commercial Readiness Hardening - Owner Aware Project Routes 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/integration
  - agentfeed/backend
  - agentfeed/frontend
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Owner Aware Project Routes 2026-05-31

## 목적

Project slug는 DB/Backend 계약상 **owner별 unique**입니다. 그런데 Frontend 공개 링크가 `/projects/{slug}`만 사용하면 서로 다른 사용자가 같은 slug를 가진 경우 ambiguous link가 되고, ProjectDetail이 paginated `/projects` scan fallback에 의존해 false 404 또는 잘못된 프로젝트로 연결될 수 있습니다.

> [!important]
> 파라미터 정렬 원칙은 [[Integration - CLI Backend Frontend#계약 기준]]처럼 **Database column name → Backend → Frontend** 순서로 맞춥니다. 이 작업에서는 DB의 `(owner_id, slug)` uniqueness를 기준으로 Backend owner-aware endpoint와 Frontend route를 맞췄습니다.

## 변경 사항

### Backend

- `agentfeed-backend/app/routers/users.py`
  - `/v1/users/{username}/projects/{project_slug}` detail response의 `project.owner`를 public user payload로 포함합니다.
- `agentfeed-backend/app/routers/search.py`
  - project search result에 `owner`를 포함하도록 query가 `Project, User`를 함께 반환합니다.
- `agentfeed-backend/app/routers/explore.py`
  - trending project card에 `owner`를 포함합니다.
- `agentfeed-backend/tests/test_contracts.py`
  - owner-aware detail/search result 계약을 회귀 테스트로 고정했습니다.

### Frontend

- `agentfeed-frontend/src/lib/api.ts`
  - `projects.getByOwnerSlug(owner, slug)`를 추가해 `/v1/users/{owner}/projects/{slug}`를 직접 호출합니다.
- `agentfeed-frontend/src/lib/project-path.ts`
  - `projectHref(owner, slug)` helper를 추가했습니다.
  - owner가 있으면 `/projects/{owner}/{slug}`, owner가 없거나 blank면 legacy `/projects/{slug}`를 반환합니다.
- `agentfeed-frontend/src/app/projects/[owner]/[slug]/page.tsx`
  - owner-aware project detail route를 추가했습니다.
- `ProjectDetailPage`
  - owner route에서는 `projects.getByOwnerSlug()`를 사용합니다.
  - legacy route에서는 `projects.get(slug)`만 사용합니다.
  - paginated project list scan fallback을 제거했습니다.
- `ProjectsPage`, `SearchPage`, `ExplorePage`, `ProfilePage`
  - owner를 알고 있는 project link는 `projectHref()`로 생성합니다.
  - public list/search/explore key는 `owner + slug`로 구성해 slug collision을 허용합니다.

## 검증 증거

- Backend
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'project or search_and_explore'` → passed (24 tests)
  - `uv run --python 3.12 --locked --group dev pytest -q` → passed (200 tests, 1 existing Starlette deprecation warning)
  - `uv run --python 3.12 --locked --group dev ruff check app/routers/users.py app/routers/search.py app/routers/explore.py tests/test_contracts.py` → passed
- Frontend
  - `npm run test:contracts` → passed
  - `npx tsc --noEmit` → passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Cross-repo dev gate
  - `make test` in `agentfeed-dev` → passed (CLI tests/typecheck/pack audit, Frontend contracts/build, Backend ruff/pytest/Alembic offline chain)

## 남은 리스크

> [!warning]
> 이미 외부에 공유된 legacy `/projects/{slug}` 링크는 여전히 id-only fallback route로 남겨두었습니다. slug-only public links는 collision-safe하지 않으므로 신규 링크 생성 지점에서는 owner-aware route만 사용해야 합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Owner-aware project route 계약]]
- [[Active Tasks#P1 후보]]
- [[AgentFeed CLI MOC]]
