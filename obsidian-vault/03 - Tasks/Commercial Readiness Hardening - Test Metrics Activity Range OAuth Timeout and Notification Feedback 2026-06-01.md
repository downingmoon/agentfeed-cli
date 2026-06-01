---
title: Commercial Readiness Hardening - Test Metrics Activity Range OAuth Timeout and Notification Feedback 2026-06-01
aliases:
  - Test metrics activity range OAuth timeout notification feedback
  - 2026-06-01 상용화 하드닝 배치 2
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/collection
  - agentfeed/auth
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Test Metrics Activity Range OAuth Timeout and Notification Feedback 2026-06-01

> [!abstract] 목적
> `agentfeed collect`가 검증량을 과소 보고하지 않게 하고, profile activity 날짜 범위와 GitHub OAuth timeout, notification mutation 실패 피드백을 상용 환경 기준으로 보정합니다.

## 수정 범위

### CLI configured test metrics

문제:

- `--run-configured-commands`로 test command를 실행해도 `tests_run=1`, `tests_passed=1/0`처럼 command 단위로만 기록했습니다.
- 실제 `pytest`, `vitest`, Node TAP, Cargo summary가 존재해도 suite 규모가 사라져 AgentFeed feed의 신뢰 신호가 약해졌습니다.

수정:

- `src/collectors/test-command.ts`에 `parseTestCommandOutput()`을 추가했습니다.
- `pytest`/generic status summary, Vitest style `Tests ... (N)`, TAP summary, Cargo `test result:` 형식에서 실제 run/pass count를 파싱합니다.
- 파싱할 수 없는 command output은 테스트 수를 꾸며내지 않고 `null`로 둔 채 `commands_run`/`failed_commands`만 보존합니다.

### Backend user activity date range

문제:

- `/v1/users/{username}/activity?to=YYYY-MM-DD`가 해당 날짜의 00:00 UTC를 exclusive upper bound로 사용해 요청한 마지막 날짜 전체를 제외했습니다.
- timezone-aware datetime도 `replace(tzinfo=UTC)`로 처리해 실제 instant가 바뀔 수 있었습니다.

수정:

- date-only `from`은 UTC day start inclusive로 처리합니다.
- date-only `to`는 요청 날짜를 포함하도록 다음 UTC day start를 exclusive upper bound로 사용합니다.
- full datetime `to`는 기존처럼 exact exclusive instant로 유지합니다.
- aware datetime은 `astimezone(UTC)`로 정규화합니다.
- response `data.to`는 date-only 요청에서 사용자가 보낸 calendar date를 유지합니다.

### Backend GitHub OAuth outbound timeout

문제:

- GitHub OAuth token exchange/user fetch가 explicit timeout 없이 `httpx.AsyncClient()`를 생성했습니다.
- 외부 네트워크 stall 시 login callback tail latency와 worker 점유 리스크가 있었습니다.

수정:

- `GITHUB_OAUTH_TIMEOUT = httpx.Timeout(10.0, connect=3.0)`를 추가했습니다.
- token exchange와 user fetch 모두 같은 bounded timeout을 사용합니다.
- connect/read timeout도 `GITHUB_OAUTH_UNAVAILABLE` 503으로 변환되는 계약을 테스트했습니다.

### Frontend notification mutation feedback and external links

문제:

- Notification read/mark-all-read mutation 실패가 optimistic UI 이후 re-fetch만 수행하고 사용자에게 실패를 보여주지 않았습니다.
- Landing/Footer의 external GitHub link가 `target="_blank" rel="noreferrer"`만 사용해 app 내 다른 external link 정책과 달랐습니다.

수정:

- `NotificationsPage`에 dedicated `actionError` state와 polite live region을 추가했습니다.
- 단일 read/mark-all-read 실패 시 사용자가 재동기화 상태를 볼 수 있습니다.
- Landing/Footer external GitHub link를 `rel="noopener noreferrer"`로 정렬하고 source contract를 추가했습니다.

## 검증 증거

- CLI
  - `npm test -- tests/test-command.test.ts tests/git-draft.test.ts --run` → 23 tests passed
  - `npm run typecheck && npm test -- --run && npm run release:preflight` → typecheck, 285 tests, release preflight passed
- Backend
  - `uv run pytest tests/test_contracts.py -k 'github_access_token_exchange or github_user_fetch or user_activity_date_range or date_only_to or public_user_activity_tokens' -q` → 7 passed
  - `uv run ruff check app/routers/users.py app/services/auth.py tests/test_contracts.py && uv run pytest -q` → ruff passed, 260 tests passed
- Frontend
  - `npm run test:contracts` → passed
  - `npm run lint` → typecheck passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → production build passed
- Cross-repo
  - `agentfeed-dev ./scripts/test-all.sh` → OpenAPI contract gate passed, CLI 285 tests/typecheck/release preflight/audit passed, Frontend CI/build/contracts/audit passed, Backend ruff/260 tests/Alembic offline chain passed

## 연결

- [[Collection System#2026-06-01 Configured test command suite counts]]
- [[Integration - CLI Backend Frontend#2026-06-01 Activity range and notification mutation feedback]]
- [[Auth & Credential Safety#2026-06-01 GitHub OAuth outbound timeout]]
- [[Active Tasks]]
