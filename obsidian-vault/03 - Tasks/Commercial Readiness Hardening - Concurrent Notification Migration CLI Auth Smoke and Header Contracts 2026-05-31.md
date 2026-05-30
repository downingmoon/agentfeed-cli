---
title: Commercial Readiness Hardening - Concurrent Notification Migration CLI Auth Smoke and Header Contracts 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/integration
status: done
created: 2026-05-31
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Concurrent Notification Migration CLI Auth Smoke and Header Contracts 2026-05-31

> [!success] 결과
> 운영 DB lock 리스크, credential-free CLI auth smoke 리스크, Frontend Header nav/search 회귀 리스크를 병렬로 닫았다. Backend migration은 online 실행에서 concurrent unique index를 사용하되 Alembic offline SQL chain은 transactional script와 호환되는 plain index를 유지한다.

## 변경 요약

### Backend

- `015_notification_dedupe_key` migration에 offline/online branch를 추가했다.
- offline `alembic upgrade head --sql`은 기존처럼 `CREATE UNIQUE INDEX uq_notifications_dedupe_key ON notifications (dedupe_key);`를 생성한다.
- online migration은 `op.get_context().autocommit_block()` 안에서 `postgresql_concurrently=True` unique index를 만든다.
- downgrade도 offline에서는 plain drop, online에서는 concurrent drop으로 mirror 처리한다.
- migration source contract는 `context.is_offline_mode()`, `autocommit_block`, `postgresql_concurrently=True`, reversible drop을 모두 요구한다.

> [!warning] 운영 주의
> 이 변경은 아직 production apply 전이라는 전제의 migration hardening이다. 이미 특정 환경에 `015_notification_dedupe_key`가 적용된 뒤라면 revision rewrite 대신 후속 migration으로 처리해야 한다.

### CLI

- `tests/cli-status-doctor.test.ts`에 credential-free browser login smoke regression을 추가했다.
- fake local auth server로 `agentfeed login --no-open --no-save`가 다음을 만족하는지 검증한다.
  - 사용 API base 표시
  - authorize URL 표시
  - “명령을 유지하면 승인 후 자동 완료” UX 문구 표시
  - raw token 미출력
  - `credentials.json` 미생성
- CI guard regression도 추가했다.
  - `AGENTFEED_CI=1`에서는 browser session API 요청 자체를 만들지 않는다.
  - token-based remediation과 `--browser` override 안내를 출력한다.

### Frontend

- `src/components/layout/header-logic.ts`로 Header nav/search pure logic을 분리했다.
- no-dependency contract harness에 다음 회귀를 추가했다.
  - signed-in/signed-out nav link set
  - `/feed`에서 root Feed link active 처리
  - non-root route는 slash boundary 기준으로 active 처리
  - search query trim/encoding
  - empty query no-op
- Header는 pure helper를 사용하므로 UI behavior는 유지하면서 contract로 검증 가능해졌다.

## 검증 증거

- CLI targeted: `npm test -- --run tests/cli-status-doctor.test.ts && npm run typecheck` → 8 tests passed + typecheck passed.
- CLI full: `npm run typecheck -- --pretty false && npm test -- --run` → 226 passed.
- Backend targeted: `RUFF_NO_CACHE=1 uv run ruff check --no-cache alembic/versions/015_notification_dedupe_key.py tests/test_contracts.py && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q tests/test_contracts.py -k 'notification_dedupe_migration or notification_model_has_dedupe_key_unique_index'` → ruff pass, 2 passed.
- Backend offline SQL: `uv run alembic upgrade head --sql` → `015_notification_dedupe_key` emits plain unique index and keeps transactional offline chain valid.
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 175 passed, known Starlette warning 1개.
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → pass.
- 통합: `agentfeed-dev make test` → CLI prepack/audit, Frontend contract/audit/build, Backend ruff/full tests, Alembic offline chain pass.
- Diff hygiene: `git diff --check` → CLI/Backend/Frontend 모두 pass.

## 남은 리스크

> [!warning]
> 상용화 목표는 계속 active다. 이번 루프는 자동화 가능한 local/static/contract gate를 강화했지만, 아래 항목은 별도 staging/live 환경 검증이 필요하다.

- 실제 GitHub OAuth credential로 browser login happy path를 사람이 개입하는 live smoke에서 검증해야 한다.
- 운영 규모 notification table에서 concurrent index 생성 시간, lock wait, rollback 절차는 staging data로 재확인해야 한다.
- Frontend는 여전히 jsdom/Playwright/RTL 없는 no-dependency contract 중심이다. 실제 browser interaction regression suite는 별도 도입 판단이 필요하다.

## 링크

- [[Auth & Credential Safety#2026-05-31 CLI auth smoke and CI guard]]
- [[Integration - CLI Backend Frontend#2026-05-31 Concurrent notification migration and Header contracts]]
- [[Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31]]
- [[Active Tasks#2026-05-31 P1 hardening continuation]]
