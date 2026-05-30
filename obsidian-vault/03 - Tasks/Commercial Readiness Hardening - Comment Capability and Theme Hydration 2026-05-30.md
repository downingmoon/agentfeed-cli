---
title: Commercial Readiness Hardening - Comment Capability and Theme Hydration 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - frontend/ux
  - backend/api-contract
  - runtime/hydration
  - project/tasks
status: implemented
aliases:
  - 2026-05-30 comment capability theme hydration
---

# Commercial Readiness Hardening - Comment Capability and Theme Hydration 2026-05-30

> [!summary]
> Worklog detail comment composer가 Backend의 실제 `allow_comments` 권한 계약을 선반영하도록 `viewer_state.can_comment`를 추가했고, theme toggle은 persisted theme bootstrap으로 SSR/client mismatch window를 줄였습니다.

## 구현 요약

### Backend comment capability contract

- `WorklogViewerState.can_comment`를 API contract에 추가했습니다.
- detail `GET /v1/worklogs/{id}`는 viewer 기준 comment 가능 여부를 계산해 반환합니다.
- anonymous viewer는 `can_comment=false`입니다.
- author는 `allow_comments=false`여도 자신의 worklog에 comment 가능하므로 `can_comment=true`입니다.
- non-author viewer는 `user_settings.allow_comments=false`이면 `can_comment=false`, 설정 row가 없으면 default 허용입니다.
- `create_comment`의 기존 enforcement도 같은 helper를 사용해 UI contract와 mutation gate를 맞췄습니다.

> [!important]
> Database/source of truth는 `user_settings.allow_comments`입니다. Backend가 `can_comment` capability로 변환하고, Frontend는 이 값을 기준으로 composer를 disable합니다.

### Frontend comment composer gating

- `ApiWorklogViewerState.can_comment` → `WorklogViewerState.canComment` adapter mapping을 추가했습니다.
- Worklog detail composer는 `currentUser && viewerState.canComment`일 때만 입력/submit이 가능합니다.
- anonymous viewer에게는 login 안내를, comment disabled viewer에게는 권한 없음 안내를 표시합니다.
- `canSubmitComment(body, submitting, canComment)` contract test로 permission-disabled submit을 막습니다.

### Theme hydration contract

- `agentfeed-theme` localStorage key를 canonical theme preference로 사용합니다.
- root layout은 `suppressHydrationWarning`을 사용하고, head inline bootstrap script가 hydration 전에 persisted theme을 `<html data-theme>`에 반영합니다.
- AppProvider initial state는 현재 DOM theme/localStorage를 읽고, state change는 DOM + localStorage로 동기화합니다.

## 검증

- Backend targeted:
  - `uv run --python 3.12 --locked --group dev ruff check app/services/worklog.py app/routers/worklogs.py app/schemas/worklog.py tests/test_contracts.py` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'comment or worklog_detail_hides_disallowed_public_metrics'` → `7 passed`
- Backend full:
  - `uv run --python 3.12 --locked --group dev ruff check .` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests -q` → `118 passed`
- Frontend:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `npx tsc --noEmit --incremental false` → passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Shared gate:
  - `cd ../agentfeed-dev && ./scripts/test-all.sh` → passed; CLI 158 tests/prepack/audit, frontend contracts/build/audit, backend 118 tests/Alembic offline chain
- Live E2E:
  - `cd ../agentfeed-dev && ./scripts/smoke-e2e.sh` → passed; uploaded worklog `f7d49103-2005-4698-8508-6873d090a1c9` and verified CLI publish → review API → frontend route → publish → feed

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 Worklog comment capability contract]]
- [[Runtime Configuration#2026-05-30 Frontend theme hydration bootstrap]]
- [[Active Tasks#새로 발견한 P1 후보 / 다음 루프]]
- [[Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30]]
