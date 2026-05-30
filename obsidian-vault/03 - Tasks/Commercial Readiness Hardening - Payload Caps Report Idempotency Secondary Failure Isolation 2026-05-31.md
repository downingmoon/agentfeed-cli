---
title: Commercial Readiness Hardening - Payload Caps Report Idempotency Secondary Failure Isolation 2026-05-31
aliases:
  - 2026-05-31 Payload Caps Report Idempotency Secondary Failure Isolation
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

# Commercial Readiness Hardening - Payload Caps Report Idempotency Secondary Failure Isolation 2026-05-31

> [!important] 목표
> [[Commercial Readiness Hardening - Secret Scanner Session Revocation Frontend Outage UX 2026-05-31]] 이후 남은 상용화 갭 중 **업로드/저장 오남용 방지**, **중복 신고 방지**, **부분 장애 UX**, **CLI 세션 증거 오탐 방지**를 닫았습니다.

## 구현 요약

### CLI

- `src/collectors/agent-session.ts`
  - Codex `apply_patch` fallback이 `custom_tool_call`만 보고 phantom changed file을 만들지 않도록, 같은 `call_id`의 실패 `function_call_output`을 추적합니다.
  - 실패 output이 먼저 등장하는 비정상 순서도 `failedToolOutputCallIds`로 방어합니다.
- `tests/session-collector.test.ts`
  - paired tool output이 실패한 patch fallback은 changed files에 포함하지 않는 회귀 테스트 추가.

### Backend

- `app/main.py`
  - `/v1/ingest`뿐 아니라 모든 mutating method(`POST`, `PUT`, `PATCH`, `DELETE`)에 512KB request body cap 적용.
- `app/schemas/limits.py`
  - user/project/worklog/comment/report 텍스트 필드 길이 상수화.
- `app/schemas/worklog.py`, `app/schemas/ingestion.py`, `app/schemas/social.py`, `app/schemas/project.py`, `app/schemas/user.py`
  - summary, user note, public prompt, comments, reports, project description, user bio 등에 명시적 max length 추가.
  - comment body는 blank-only 입력을 거부합니다.
- `app/models/social.py`, `app/routers/social.py`, `alembic/versions/013_report_idempotency.py`
  - `(reporter_id, target_type, target_id)` unique constraint 추가.
  - 기존 중복 report는 migration에서 rank 기반으로 정리 후 constraint 생성.
  - 중복 report insert conflict는 idempotent success로 처리합니다.
- `app/routers/search.py`
  - project slug suggestions도 `_ilike(..., escape='\\')` 경로로 통일해 wildcard escape 누락을 제거했습니다.

### Frontend

- `src/lib/api.ts`
  - GET뿐 아니라 body 없는 POST/DELETE도 `Content-Type: application/json`을 보내지 않게 하여 불필요한 CORS preflight를 줄였습니다.
- `src/lib/list-merge.ts`
  - cursor pagination 중복 제거 공통 helper 추가.
- `ProfilePage`, `ProjectDetailPage`, `DashboardPage`, `ExplorePage`
  - primary data와 secondary list/section fetch를 분리해, 보조 API 실패가 전체 페이지를 무너뜨리지 않도록 격리했습니다.
- `ProjectsPage`, `LeaderboardPage`, `NotificationsPage`, `ProfilePage`, `ProjectDetailPage`
  - load-more append에서 stable key 기반 dedup 적용.
- `src/lib/api-contract.test.ts`
  - body 없는 POST/DELETE header contract와 list merge helper 회귀 테스트 추가.

> [!warning] 남은 리스크
> OS Keychain 기반 CLI token storage, Backend leaderboard 고카디널리티 성능 개선, publish notification 동시성 race 방지는 후속 상용화 hardening 후보로 남아 있습니다.

## 검증 결과

> [!success] Gate 통과
> 현재 변경 기준으로 3개 레포 개별 gate와 `agentfeed-dev make test` 통합 gate가 통과했습니다.

- CLI: `npm run typecheck && npm test -- --run` → 218 passed
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Backend: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 166 passed, 1 known Starlette warning
- Integration: `make test` in `agentfeed-dev` → passed
  - CLI prepack/npm audit 포함
  - Frontend contract/audit/build 포함
  - Backend ruff/pytest 포함
  - Alembic offline chain `013_report_idempotency`까지 통과
- Diff hygiene: `git diff --check` across touched repos → passed

## 관련 링크

- [[Active Tasks]]
- [[Privacy Safety]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Secret Scanner Session Revocation Frontend Outage UX 2026-05-31]]
