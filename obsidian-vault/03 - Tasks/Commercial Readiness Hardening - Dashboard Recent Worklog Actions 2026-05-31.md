---
title: Commercial Readiness Hardening - Dashboard Recent Worklog Actions 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/integration
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Dashboard Recent Worklog Actions 2026-05-31

## 목적

Dashboard recent worklogs가 모든 상태를 `/worklogs/{id}` public/detail route로 보내면, `needs_review`, `draft`, `private` 상태의 다음 행동이 끊길 수 있습니다. Dashboard는 사용자의 작업 관리 화면이므로 row 클릭은 현재 상태에서 가장 안전한 다음 action으로 연결돼야 합니다.

> [!important]
> API 계약은 Backend가 `action_url`을 내려주고, Frontend는 이 값을 우선 사용하되 안전하지 않은 값이면 status 기반 fallback을 사용합니다.

## 변경 사항

- `agentfeed-backend/app/routers/me.py`
  - `/me/dashboard/recent-worklogs` 각 row에 `action_url`을 추가했습니다.
  - `public` / `unlisted`는 `/worklogs/{id}`로 연결합니다.
  - 그 외 상태는 `/worklogs/{id}/review`로 연결합니다.
- `agentfeed-frontend/src/lib/api.ts`
  - `ApiDashboardRecentWorklog.action_url` 계약을 추가했습니다.
- `agentfeed-frontend/src/lib/dashboard-actions.ts`
  - `dashboardRecentWorklogHref()` helper를 추가했습니다.
  - Backend `action_url`이 내부 `/worklogs/...` 경로가 아니면 외부/unsafe URL로 보고 status 기반 fallback을 사용합니다.
- `agentfeed-frontend/src/components/pages/DashboardPage.tsx`
  - recent worklog link를 hard-coded public detail route에서 `dashboardRecentWorklogHref(w)`로 변경했습니다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Dashboard가 status-aware helper를 사용하고 hard-coded public detail route를 쓰지 않는 계약을 고정했습니다.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - review/public fallback/unsafe external action URL 방어 helper 계약을 고정했습니다.
- `agentfeed-frontend/src/lib/integration-contract.ts`
  - recent worklog response의 `action_url` 타입 계약을 추가했습니다.

## 검증 증거

- RED:
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k dashboard_recent_worklogs` → `KeyError: 'action_url'`
  - `npm run test:contracts -- --run src/lib/page-source-contract.test.ts` → Dashboard status-aware helper 미사용으로 실패
- GREEN:
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k dashboard_recent_worklogs` → passed
  - `uv run --python 3.12 --locked --group dev ruff check app/routers/me.py tests/test_contracts.py` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'dashboard_recent_worklogs or rate_limit_rules_cover'` → passed
  - `uv run --python 3.12 --locked --group dev pytest -q` → passed (201 tests, 기존 Starlette deprecation warning 1건)
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → passed
  - `make test` in `agentfeed-dev` → passed (CLI 234 tests + prepack, Frontend contracts/build, Backend 201 tests + Alembic offline migration)

## 남은 리스크

> [!note]
> Dashboard action은 authenticated owner surface 기준입니다. Public feed/profile/project card route에는 영향을 주지 않습니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Dashboard recent worklog action route 계약]]
- [[Active Tasks#P1 후보]]
