---
title: Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30
aliases:
  - Leaderboard Pagination Slug Env Token Hardening
  - 2026-05-30 Leaderboard Slug Env Token P1
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Leaderboard Pagination Slug Uniqueness Env Token UX 2026-05-30

> [!important] 목표
> 남은 상용화 P1 gap 중 Backend leaderboard pagination 불일치, project slug race/duplicate 위험, CLI `AGENTFEED_TOKEN` rotation 안내를 하나의 계약으로 닫았습니다.

## 배경

병렬 audit에서 다음 불일치가 확인되었습니다.

- Backend `/v1/leaderboard`는 `cursor` parameter를 받지만 실제 query에 적용하지 않았고, Frontend도 첫 페이지만 보여줬습니다.
- Project slug는 application-level precheck만 있어 동시 생성 시 같은 `(owner_id, slug)` active row가 생길 수 있었습니다.
- CLI `agentfeed rotate`는 saved credential은 안전하게 교체하지만, env token 사용자는 “unset 또는 browser” 정도로만 안내되어 shell/secret manager 운영자가 다음 행동을 명확히 알기 어려웠습니다.

## 변경 범위

- [[Integration - CLI Backend Frontend#2026-05-30 Leaderboard cursor pagination contract|Leaderboard cursor pagination contract]]
- [[Integration - CLI Backend Frontend#2026-05-30 Project slug uniqueness and race safety|Project slug uniqueness and race safety]]
- [[Runtime Configuration#2026-05-30 Environment token rotation remediation|Environment token rotation remediation]]

## 구현 요약

### Backend

- `/v1/leaderboard` response를 `{ data, pagination }` envelope로 고정하고 `LeaderboardListResponse` response model을 연결했습니다.
- `cursor`는 offset cursor로 decode되며 malformed cursor는 첫 페이지로 fail-open합니다.
- ranking query는 stable tie-breaker(`User.id`)와 `limit + 1` fetch로 `has_more` / `next_cursor`를 계산합니다.
- `longest_streak` ranking도 동일한 offset contract와 global rank metadata를 반환합니다.
- `projects` table에 partial unique index `ux_projects_owner_slug_active(owner_id, slug) WHERE deleted_at IS NULL`를 추가했습니다.
- `POST /v1/projects`는 unique race 발생 시 rollback 후 slug suffix를 재시도하고, 초과 시 controlled conflict를 반환합니다.
- Ingest project auto-create는 flush unique race 후 existing project를 재조회해 같은 project로 수렴합니다.
- legacy duplicate가 있을 수 있는 `/users/{username}/projects/{project_slug}` lookup은 deterministic order + limit로 안전하게 조회합니다.

### Frontend

- `leaderboard.get()`은 Backend pagination envelope을 반환하고 `cursor` option을 전달합니다.
- `/leaderboard` page는 첫 페이지와 추가 페이지를 append하고, row rank는 array index가 아니라 Backend `rank` metadata를 표시합니다.
- OAuth/login `next` allowlist는 `/leaderboard?type&period&cursor&limit`만 보존합니다.

### CLI

- `AGENTFEED_TOKEN` source에서 `agentfeed rotate`를 실행하면 raw secret을 출력하지 않고, env var를 in-place로 바꾸지 않는다는 점을 명확히 안내합니다.
- 안내는 AgentFeed Settings에서 token을 rotate/issue한 뒤 shell 또는 secret manager의 `AGENTFEED_TOKEN`을 교체하라고 설명합니다.
- saved credential flow로 전환하려면 `unset AGENTFEED_TOKEN && agentfeed rotate --browser`를 실행하라고 안내합니다.

## 계약

> [!warning] Leaderboard cursor
> 현재 leaderboard cursor는 offset cursor입니다. 정렬 기준은 metric desc + user id asc로 안정화했지만, 대량 데이터/동시 변경 환경에서 keyset cursor보다 약합니다.

> [!warning] Project slug source of truth
> Database partial unique index가 최종 source of truth입니다. Backend는 이 constraint에 맞춰 retry하고, Frontend/CLI는 `slug`를 별도 alias(`tag` 등)로 재해석하지 않습니다.

> [!note] Env token rotation
> CLI는 process environment를 수정할 수 없고 raw browser-issued token도 출력하지 않습니다. env token 사용자는 Settings 또는 secret manager workflow에서 값을 교체해야 합니다.

## 검증 결과

> [!success] 통과한 gate
> 세 레포 targeted/full gate, migration SQL generation, dev 통합 gate, live smoke가 모두 통과했습니다.

- Backend:
  - `uv run --python 3.12 --locked --group dev ruff check app/routers/leaderboard.py app/schemas/leaderboard.py app/models/project.py app/routers/projects.py app/routers/ingest.py app/routers/users.py tests/test_contracts.py alembic/versions/009_project_owner_slug_unique.py`
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'leaderboard or project_slug or create_project_retries or ingest_project_create_race or user_project_slug_lookup'` → 8 passed
  - `uv run --python 3.12 --locked --group dev pytest -q` → 135 passed
  - `uv run --python 3.12 --locked alembic upgrade head --sql` → `009_project_slug_unique` SQL generated
- Frontend:
  - `npm run test:contracts && npm run lint`
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- CLI:
  - `npm run build && npm run typecheck && npm test -- --run tests/cli-status-doctor.test.ts tests/config.test.ts tests/api-hook.test.ts` → 47 passed
  - `npm test -- --run` → 167 passed
- Integration:
  - `../agentfeed-dev/scripts/test-all.sh` → passed
  - `../agentfeed-dev/scripts/smoke-e2e.sh` → passed

Live smoke 결과:

```text
E2E smoke passed
Verified CLI publish → review API → frontend route → publish → feed for 11e60b03-e139-49ed-a9c9-dd1518084f6e
```

## 남은 리스크

- 운영 DB에 이미 active duplicate `(owner_id, slug)`가 있으면 migration은 의도적으로 중단됩니다. 운영 적용 전 duplicate merge query를 dry-run해야 합니다.
- Leaderboard offset cursor는 충분히 단순하지만, 높은 traffic이나 ranking churn이 커지면 keyset/rank snapshot cursor로 고도화할 수 있습니다.
- `AGENTFEED_TOKEN` env rotation은 보안상 raw token 출력 없이 안내만 제공합니다. Secret manager별 자동 갱신은 별도 integration scope입니다.

## 관련 링크

- [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30]]
- [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]]
- [[Integration - CLI Backend Frontend]]
- [[Runtime Configuration]]
- [[Active Tasks#다음 하드닝 후보]]
