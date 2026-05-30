---
title: Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - backend/api-contract
  - frontend/auth
  - security/rate-limit
  - agentfeed/collection
  - project/tasks
status: implemented
aliases:
  - 2026-05-30 card capabilities rate limits dry run safety
---

# Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30

> [!summary]
> 병렬 readiness audit 결과를 반영해 list/card payload의 `viewer_state.can_comment` 계약, anonymous social action auth redirect, Backend mutation rate-limit coverage, CLI `share --dry-run` command safety를 보강했습니다.

## 구현 요약

### Backend card comment capability propagation

- Worklog detail에서만 정확하던 `viewer_state.can_comment` capability를 feed/profile/project/explore/bookmark/search card payload에도 전달했습니다.
- `feed`, `users`, `projects`, `explore`, `me`, `search` route가 viewer 기준 `check_comment_permission()` 결과를 `_build_worklog_card()` / `_build_worklog_result()`에 넘깁니다.
- `/me/worklogs`는 작성자 본인 경로이므로 `can_comment=true`를 명시합니다.
- authenticated non-author viewer가 댓글 허용 작성자의 public card를 볼 때 card payload도 `can_comment=true`를 반환하도록 contract test를 추가했습니다.

> [!important]
> `viewer_state.can_comment`의 source of truth는 Backend permission helper입니다. Frontend는 card/detail 어디서든 capability 값을 UI gate로 사용할 수 있어야 합니다.

### Backend mutation rate-limit coverage

- worklog/project create/update/delete mutation에 rate-limit bucket을 추가했습니다.
- privacy-finding resolve와 publish/unpublish mutation도 nested id normalization을 거쳐 shared bucket에 들어가도록 보강했습니다.
- rate-limit contract test가 critical mutation path와 nested resource-id normalization을 확인합니다.

### Frontend unauthenticated social action guard

- public card에서 signed-out 상태의 like/bookmark click이 API mutation으로 진행되지 않도록 `AppContext`에서 선차단합니다.
- anonymous user는 현재 route/query를 `next`로 보존한 GitHub OAuth URL로 이동합니다.
- API config 오류가 있는 경우에는 redirect를 시도하지 않아 잘못된 config 상태를 덮어쓰지 않습니다.

### CLI share dry-run command safety

- `agentfeed share --dry-run`은 `.agentfeed/config.json`의 `run_tests_on_collect=true`가 설정되어 있어도 configured project commands를 실행하지 않습니다.
- dry-run은 업로드 preview/safety path로 남기고, project-local command 실행은 실제 collect/share path에서만 허용합니다.
- 회귀 테스트는 marker file을 쓰는 configured command가 dry-run에서 실행되지 않는지 검증합니다.

## 검증

- Backend targeted:
  - `uv run --python 3.12 --locked --group dev ruff check app/routers/feed.py app/routers/users.py app/routers/projects.py app/routers/explore.py app/routers/me.py app/routers/search.py app/middleware/rate_limit.py tests/test_contracts.py` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'can_comment or rate_limit'` → `8 passed, 98 deselected`
- Backend full:
  - `uv run --python 3.12 --locked --group dev ruff check .` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests -q` → `119 passed`
- Frontend:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `npx tsc --noEmit --incremental false` → passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- CLI:
  - `npm run build` → passed
  - `npm test -- --run tests/cli-share.test.ts tests/git-draft.test.ts` → `17 passed`
  - `npm test -- --run` → `159 passed`
  - `npm run typecheck` → passed
  - `npm pack --dry-run` → passed
  - `npm audit --omit=dev --audit-level=moderate` → 0 vulnerabilities
- Shared gate:
  - `cd ../agentfeed-dev && ./scripts/test-all.sh` → passed; CLI 159 tests/prepack/audit, Frontend contracts/typecheck/audit/build, Backend ruff/119 tests/Alembic offline chain
- Live E2E:
  - `cd ../agentfeed-dev && ./scripts/smoke-e2e.sh` → passed; uploaded worklog `c9f97ce6-5c8c-4ed9-9e58-ded28fda767d` and verified CLI publish → review API → frontend route → publish → feed

## 남은 후보

> [!todo]
> 이번 루프에서 확인했지만 아직 구현하지 않은 항목은 다음 상용화 하드닝 루프 후보로 유지합니다.

- Backend ingestion token expiry / invalidation policy와 migration 설계
- Frontend share failure user feedback
- Frontend feed filter URL sync
- CLI repo `.env` unsafe API discovery diagnostic
- CLI credential source provenance를 `status` / `doctor`에 명시

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 Worklog card can_comment propagation]]
- [[Integration - CLI Backend Frontend#2026-05-30 Unauthenticated social action guard]]
- [[Auth & Credential Safety#2026-05-30 Worklog and project mutation rate-limit coverage]]
- [[Collection System#2026-05-30 share dry-run command execution guard]]
- [[Active Tasks#새로 발견한 P1 후보 / 다음 루프]]
- [[Commercial Readiness Hardening - Comment Capability and Theme Hydration 2026-05-30]]
