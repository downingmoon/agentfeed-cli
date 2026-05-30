---
title: Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31
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
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31

> [!success] 결과
> 이전 루프에서 남긴 keychain 실제 smoke, notification settings gate, Frontend social action behavior coverage 리스크를 닫았다. Native keychain test는 기본 suite에서는 안전하게 opt-in이고, 이번 macOS 로컬 환경에서 실제 `security` round-trip까지 검증했다.

## 변경 요약

### CLI

- `tests/config.test.ts`에 native macOS keychain round-trip smoke를 추가했다.
- 실행 조건은 명시적 opt-in이다.
  - `process.platform === "darwin"`
  - `CI` 아님
  - `AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS=1`
- 테스트는 dummy token을 OS keychain에 저장하고, `credentials.json`에는 keychain metadata만 남으며 raw token이 저장되지 않는지 확인한다.
- `loadCredentialsWithMetadata()`가 native keychain에서 token을 다시 읽어 `token_source=keychain`, `credential_store=keychain`으로 resolve하는지 확인한다.
- 테스트 종료 시 `security delete-generic-password`로 smoke credential을 정리한다.

> [!note] macOS HOME 주의
> 테스트는 credential home은 `AGENTFEED_HOME`으로 격리하되, `security`가 사용자의 login keychain을 찾을 수 있도록 `HOME`은 실제 OS home으로 되돌린 뒤 수행한다.

### Backend

- `create_notification(..., dedupe_key=...)`가 사용자 notification setting gate를 먼저 존중하고, disabled setting일 때 DB insert를 하지 않는 contract test를 추가했다.
- `015_notification_dedupe_key` migration이 nullable column, unique index, downgrade drop을 모두 포함하는지 source-level migration contract로 고정했다.

### Frontend

- `src/lib/social-action-state.ts`를 추가해 optimistic like/bookmark state transition을 pure helper로 분리했다.
- `AppContext`는 helper를 사용해 auth wait/sign-in, duplicate pending guard, optimistic update, rollback, pending clear를 동일한 계약으로 처리한다.
- no-dependency contract harness에 social action behavior assertions를 추가했다.

## 검증 증거

- CLI native keychain smoke: `AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS=1 npx vitest run tests/config.test.ts -t "native macOS keychain" --run` → 1 passed.
- CLI full: `npm run typecheck -- --pretty false && npm test -- --run` → 224 passed.
- Backend targeted: `uv run pytest -q tests/test_contracts.py -k 'notification'` → 6 passed.
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 175 passed, known Starlette warning 1개.
- Frontend: `npm run lint && npm run test:contracts` → pass.
- Frontend build: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → pass.
- 통합: `agentfeed-dev make test` → CLI prepack/audit, Frontend contract/audit/build, Backend ruff/full tests, Alembic offline chain `015_notification_dedupe_key`까지 pass.
- Diff hygiene: `git diff --check` 3개 변경 레포 pass.

## 남은 리스크

> [!warning]
> 상용화 목표는 계속 active다. 이번 루프는 keychain smoke와 behavior contract를 진전시켰지만, 아래 검증은 별도 루프로 남는다.

- Frontend는 아직 jsdom/Playwright/RTL 같은 실제 browser interaction harness가 없다. 현재는 no-dependency pure/helper/source contract로 방어 중이다.
- 운영 DB 규모에서 notification index 생성 lock time, feed/search/leaderboard `EXPLAIN ANALYZE`는 실제 staging/production-like data가 있어야 더 강하게 검증할 수 있다.
- 실제 GitHub OAuth credential 환경에서 CLI browser login happy path는 dev smoke와 unit 계약 외 별도 live credential smoke가 필요하다.

## 링크

- [[Auth & Credential Safety#2026-05-31 Native macOS keychain smoke]]
- [[Integration - CLI Backend Frontend#2026-05-31 Notification settings gate and social action contracts]]
- [[Commercial Readiness Hardening - Session Parser Bounds Notification Dedupe and Comment Contracts 2026-05-31]]
- [[Active Tasks#2026-05-31 P1 hardening continuation]]
