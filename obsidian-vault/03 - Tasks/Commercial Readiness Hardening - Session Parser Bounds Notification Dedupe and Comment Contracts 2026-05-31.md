---
title: Commercial Readiness Hardening - Session Parser Bounds Notification Dedupe and Comment Contracts 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/security
status: done
created: 2026-05-31
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Collection System]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Session Parser Bounds Notification Dedupe and Comment Contracts 2026-05-31

> [!success] 결과
> CLI agent session transcript 수집의 oversized/pathological input guard, Backend notification idempotency, Frontend pagination/action/comment contract regression을 함께 보강하고 3레포 통합 gate까지 통과했다.

## 변경 요약

### CLI

- Agent session JSONL parser에 bounded read guard를 추가했다.
- 기본 한도:
  - `AGENTFEED_SESSION_FILE_MAX_BYTES` fallback: 10 MiB
  - `AGENTFEED_SESSION_JSONL_MAX_ROWS` fallback: 50,000 rows
  - `AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS` fallback: 1,000,000 chars
- explicit `--session-file`도 파일 크기/파일 타입 검사를 통과하지 못하면 project match와 metrics 수집에서 제외된다.
- 비정상적으로 긴 JSONL line은 skip하되, 정상 `session_meta` 같은 bounded row는 유지해 session identity가 보존된다.

> [!important] 수집 안전 원칙
> AgentFeed의 핵심 기능은 로컬 agent transcript를 privacy-safe evidence로 바꾸는 것이므로, parser는 “많이 읽기”보다 “bounded input에서 검증 가능한 row만 수집하기”를 우선한다.

### Backend

- `notifications.dedupe_key` nullable column과 unique index `uq_notifications_dedupe_key`를 추가했다.
- `create_notification(..., dedupe_key=...)`는 PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`을 사용해 중복 알림을 DB 레벨에서 idempotent 처리한다.
- deterministic dedupe key를 주요 producer에 연결했다.
  - `new_worklog_from_following:{worklog_id}:{follower_id}`
  - `new_follower:{target_user_id}:{actor_user_id}`
  - `worklog_like:{worklog_id}:{actor_user_id}`
  - `prompt_bookmark:{worklog_id}:{actor_user_id}`
  - `worklog_comment:{comment_id}`
- Alembic `015_notification_dedupe_key`를 추가했다.

### Frontend

- 기존 no-dependency contract harness를 확장해 API pagination/action surfaces를 더 넓게 잠갔다.
- 추가 contract 대상:
  - `projects.list`
  - `search.query`
  - `leaderboard.get`
  - `me.worklogs`
  - `me.bookmarks`
  - `me.notifications`
  - `me.markNotificationRead`
  - `me.markAllNotificationsRead`
- Dashboard partial-failure isolation과 Worklog detail comments secondary-data contract를 source-level regression으로 추가했다.
- Worklog detail 초기 comments load와 submit path도 `appendUniqueComments`를 거치게 해 duplicated rows를 막았다.

## 검증 증거

- CLI targeted: `npx vitest run tests/session-collector.test.ts --run` → 56 passed.
- CLI full: `npm run typecheck -- --pretty false && npm test -- --run` → 223 passed.
- Backend targeted: `uv run pytest -q tests/test_contracts.py -k 'notification or publish_public_worklog'` → 5 passed.
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 173 passed, known Starlette warning 1개.
- Frontend: `npm run test:contracts && npm run lint` → pass.
- Frontend build: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → pass.
- 통합: `agentfeed-dev make test` → CLI prepack/audit, Frontend contract/audit/build, Backend ruff/full tests, Alembic offline chain `015_notification_dedupe_key`까지 pass.
- Diff hygiene: `git diff --check` 3개 변경 레포 pass.

## 남은 리스크

> [!warning]
> 전체 상용화 목표는 계속 active다. 이번 루프는 parser/input bound, notification idempotency, regression contract를 닫았지만 아래 항목은 다음 hardening 후보로 유지한다.

- CLI native keychain 실제 OS command smoke는 아직 별도 환경에서 확인해야 한다.
- Backend notification dedupe는 Postgres contract 기준으로 검증했지만, 운영 DB migration 적용 전에는 기존 duplicate cleanup 정책을 점검해야 한다.
- Frontend contract harness는 no-dependency source/API 계약을 잘 잠그지만, 실제 browser/component rendering harness는 아직 없다.
- 대규모 실DB `EXPLAIN ANALYZE` 기반 feed/search/leaderboard 튜닝은 별도 운영 데이터가 필요하다.

## 링크

- [[Collection System#2026-05-31 Session parser bounded input guard]]
- [[Integration - CLI Backend Frontend#2026-05-31 Notification dedupe and frontend comment contracts]]
- [[Commercial Readiness Hardening - Keychain Publish Race Leaderboard Scale and Frontend Contracts 2026-05-31]]
- [[Active Tasks#P1 후보]]
