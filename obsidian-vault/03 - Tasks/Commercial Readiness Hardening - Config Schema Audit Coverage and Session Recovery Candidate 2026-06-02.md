---
title: Commercial Readiness Hardening - Config Schema Audit Coverage and Session Recovery Candidate 2026-06-02
aliases:
  - Config Schema Audit Coverage
  - Audit Request ID Coverage
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: complete
created: 2026-06-02
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Runtime Configuration]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Config Schema Audit Coverage and Session Recovery Candidate 2026-06-02

> [!success] Outcome
> CLI는 malformed `.agentfeed/config.json`을 조용히 통과시키지 않고 필드 단위 오류로 fail-fast합니다. Backend는 주요 mutation audit trail에 request id를 연결하고, 프로젝트/워크로그/설정/신고/ingest 변경 이벤트를 durable audit event로 남깁니다.

## 변경 요약

### CLI — project config schema guard

- `src/config/project-config.ts`에 dependency-free runtime validator/normalizer를 추가했습니다.
- 검증 범위: root object, `project`, `tags`, `collection`, `privacy`, `agents`, `commands`.
- malformed config가 `collect` 경로에서 내부 예외처럼 보이지 않고 사용자에게 명확한 `Invalid project config` 오류로 노출됩니다.
- Regression:
  - `tests/config.test.ts`
  - `tests/cli-collect.test.ts`

### Backend — mutation audit coverage and request correlation

- `app/services/audit.py`에 `audit_request_id()` helper를 추가해 middleware state의 request id만 안전하게 읽습니다.
- 주요 router audit call에 `request_id=`를 연결했습니다.
- 신규 audit event:
  - `user.profile.updated`
  - `user.username.updated`
  - `user_settings.privacy.updated`
  - `user_settings.notifications.updated`
  - `project.created` / `project.updated` / `project.deleted`
  - `worklog.created` / `worklog.updated` / `worklog.deleted`
  - `worklog.ingested` / `worklog.ingest.reused`
  - `report.created`
- Source contract로 `app/routers/*.py`의 모든 `record_audit_event(...)` 호출이 `request_id=`를 포함하도록 고정했습니다.

### Frontend — 다음 P1 후보 감사

> [!todo] Next P1 Candidate
> `auth.me()` 401과 일반 API 401 이벤트가 signed-out redirect처럼 보이며, 사용자에게 명시적 session-expired recovery state를 남기지 않는 경로가 있습니다.

감사 근거:

- `src/lib/api.ts`는 401에서 `agentfeed:auth-error` 이벤트를 dispatch합니다.
- `src/contexts/AppContext.tsx`는 이벤트 수신 시 사용자/session state를 비우지만 `authError`를 지웁니다.
- `auth.me()` bootstrap 401도 명시적 session-expired 상태 없이 signed-out state로만 귀결될 수 있습니다.

권장 후속:

1. `AppContext`에 `sessionExpired` 또는 동등한 recovery 상태를 추가합니다.
2. API 401 이벤트와 bootstrap 401 모두에서 사용자가 볼 수 있는 재로그인 CTA/copy를 유지합니다.
3. `auth.me()` 401 및 request 401 이벤트 regression test를 추가합니다.

## 검증 증거

> [!example] Local verification
> - CLI: `npm test -- --run` — 23 files / 345 tests passed
> - CLI: `npm run typecheck` — passed
> - CLI: `npm run release:preflight` — passed
> - Backend: `ruff check` targeted files — passed
> - Backend: `pytest` — 316 passed, 1 warning
> - Frontend: `npm run lint` — passed
> - Frontend: `npm run test` — passed
> - Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` — passed
> - Dev integration: `./scripts/test-all.sh` — passed through CLI, Frontend, Backend pytest, Alembic offline migration chain, OpenAPI/shared gate, commercial readiness contracts

## 남은 외부 릴리즈 차단

> [!warning]
> Hosted 환경은 아직 코드 문제가 아니라 배포/DNS 문제로 차단되어 있습니다. `https://agentfeed.dev/`는 stale `/login` redirect를 반환하고, `api.agentfeed.dev`는 준비되지 않은 상태로 반복 관측되었습니다.

릴리즈 전 완료 조건:

- `https://agentfeed.dev/` root가 최신 landing/login routing contract를 만족해야 합니다.
- `https://api.agentfeed.dev/v1/metadata`가 DNS + HTTPS + JSON metadata contract를 만족해야 합니다.
- `agentfeed-dev`의 default `make commercial-readiness`가 `COMMERCIAL_READINESS_PASSED`를 출력해야 합니다.

## 연결

- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Keychain Unmatched Settings CI 2026-06-02]]
- [[Active Tasks]]
