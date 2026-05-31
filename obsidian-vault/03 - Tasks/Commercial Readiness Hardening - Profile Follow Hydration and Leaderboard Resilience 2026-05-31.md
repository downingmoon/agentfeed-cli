---
title: Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31
aliases:
  - Profile follow hydration and leaderboard resilience
created: 2026-05-31
updated: 2026-05-31
status: done
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/integration
---

# Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31

> [!success]
> Public social surfaces now fail soft on malformed leaderboard rows and hydrate profile follow controls from server-owned viewer state.

## 목적

상용화 readiness audit의 P2 항목 중 public page crash와 stale follow UX를 제거했습니다.

- [[Integration - CLI Backend Frontend#2026-05-31 Profile follow hydration and leaderboard resilience]]
- [[Commercial Readiness Audit Followups 2026-05-31]]
- [[Active Tasks#P2 후보]]

## 문제

### Leaderboard malformed-row isolation

- Frontend leaderboard가 `row.user.id`, `row.user.username`, `row.main_metric.*`를 직접 접근했습니다.
- Backend 또는 외부 API 경계에서 malformed row 하나가 섞이면 전체 `/leaderboard` page가 crash할 수 있었습니다.

### Profile follow control hydration

- Profile page가 `following=false`로 시작하고 profile API에서 viewer follow state를 받지 않았습니다.
- 사용자가 이미 follow 중인 profile도 첫 렌더에서 `Follow`로 보일 수 있었습니다.
- 자기 자신의 profile에서도 follow control suppression이 명확히 계약화되지 않았습니다.

## 변경

### Backend

- `/v1/users/{username}` profile response에 authenticated viewer용 `viewer_state.following`을 추가했습니다.
- viewer가 profile owner 본인인 경우 `following=false`를 반환하고 추가 follow lookup을 수행하지 않습니다.
- `PublicUser` schema에 `UserViewerState`를 추가해 response contract를 명시했습니다.

### Frontend

- `safeLeaderboardItems()` adapter를 추가해 usable `user.id || user.username`과 `main_metric.label/value`가 있는 row만 React state에 저장합니다.
- leaderboard list key를 `leaderboardUserKey()`로 통일해 id가 없고 username만 있는 row도 안전하게 렌더링합니다.
- Profile page가 `profile.viewer_state?.following`으로 follow 상태를 hydrate합니다.
- 자기 profile에서는 follow control을 숨깁니다.
- follow/unfollow pending lock, optimistic rollback, visible error message를 추가했습니다.

## 검증

> [!check] Backend
> - `PYTHONDONTWRITEBYTECODE=1 uv run pytest -q -p no:cacheprovider tests/test_contracts.py -k 'user_profile_hydrates_viewer_following_state or user_profile_self_viewer_state_never_reports_following'`
> - `PYTHONDONTWRITEBYTECODE=1 uv run pytest -q -p no:cacheprovider` → 205 passed
> - `PYTHONDONTWRITEBYTECODE=1 uv run ruff check --no-cache app tests`
> - `git diff --check`

> [!check] Frontend
> - `npm run lint`
> - `npm run test:contracts`
> - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build`
> - `git diff --check`

> [!check] Cross-repo
> - `make test` in `agentfeed-dev` → CLI 247 tests, frontend contracts/build/audit, backend 205 tests, Alembic offline migration chain passed.

## Commits

- Backend: `5349e15` — `Hydrate profile follow state for reliable social UX`
- Frontend: `e520d07` — `Make social pages resilient to partial API payloads`

## 남은 리스크

> [!todo]
> 이 작업은 public social surface resilience에 한정됩니다. token-authenticated ingestion token rotation risk는 아직 [[Commercial Readiness Audit Followups 2026-05-31#Backend token-authenticated ingestion token rotation risk]]에 남아 있습니다.
