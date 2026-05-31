---
title: Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31
aliases:
  - OAuth Cookie Scope JSON Upload Signout State
  - 2026-05-31 Cookie JSON Upload Signout Hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/auth
  - agentfeed/collection
  - agentfeed/frontend
  - hardening
status: verified
created: 2026-05-31
---

# Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31

관련: [[AgentFeed CLI MOC]], [[Auth & Credential Safety]], [[Collection System]], [[Integration - CLI Backend Frontend]], [[Active Tasks]]

> [!abstract] 목표
> CLI, Backend, Frontend가 상용 환경에서 작은 계약 누락 때문에 흐름이 끊기지 않도록 OAuth browser session cookie scope, `collect --json --upload`, agent session metadata URI parsing, sign-out social state reset을 보강했습니다.

## 수정 범위

### Backend — GitHub OAuth cookie scope

> [!success]
> `/v1/auth/github/callback`에서 발급한 browser `access_token` cookie가 `/v1/me` 같은 API route에도 전송되도록 `Path=/`를 명시했습니다.

- `agentfeed_oauth_state` cookie 발급/삭제에 같은 path를 사용합니다.
- logout도 같은 path로 `access_token`을 삭제해 stale browser session을 남기지 않습니다.
- 회귀 테스트가 callback 성공 시 access cookie와 state clear cookie 모두 `Path=/` 계약을 검증합니다.

### CLI — JSON upload와 metadata path resilience

> [!success]
> `agentfeed collect --json --upload`가 JSON 출력 전에 실제 private review upload를 수행하고, 출력 draft의 `upload` metadata를 채우도록 보정했습니다.

- 기존에는 `--json` branch가 먼저 return되어 `--upload`가 조용히 무시될 수 있었습니다.
- malformed `file://` URI metadata는 collection 전체를 abort하지 않고 해당 row만 안전하게 제외합니다.
- valid encoded URI는 기존처럼 project-relative changed file로 집계합니다.

### Frontend — sign-out auth-scoped state reset

> [!success]
> sign-out 후 이전 사용자의 optimistic like/bookmark/pending/error state가 다음 session UI에 남지 않도록 초기화했습니다.

- `likes`, `bookmarks`, `likePending`, `bookmarkPending` state를 초기화합니다.
- pending ref도 함께 초기화해 다음 session의 duplicate-click guard가 stale id에 묶이지 않도록 했습니다.
- source contract가 AppContext sign-out reset 항목을 고정합니다.

## 검증 증거

- CLI: `npm test -- --run tests/session-collector.test.ts tests/cli-collect.test.ts` → 2 files / 62 tests passed
- CLI: `npm test -- --run` → 19 files / 248 tests passed
- CLI: `npm run typecheck` → passed
- Backend: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'github_login_sets_cookie_bound_oauth_state or github_callback_sets_api_wide_session_cookie_and_clears_state or logout_revokes_existing_browser_session_tokens'` → 3 passed
- Backend: `uv run --python 3.12 --locked --group dev pytest -q` → 207 passed, 1 warning
- Backend: `uv run --python 3.12 --locked --group dev ruff check app/routers/auth.py tests/test_contracts.py` → passed
- Frontend: `npm run test:contracts && npm run lint` → passed
- Frontend: `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8001/v1 npm run build` → passed

## 남은 상용화 후보

> [!warning]
> 이번 변경은 발견된 low-risk P1/P2 gap을 닫은 것입니다. 아래 후보는 별도 설계/검증 단위로 분리하는 편이 안전합니다.

- CLI default credential store가 keychain unavailable 환경에서 plaintext file fallback을 허용할지, 명시 opt-in으로 전환할지 정책 결정.
- Backend DB-backed rate-limit의 DB outage fail-open/fail-closed 정책과 운영 알림 설계.
- Backend public route `response_model` coverage 확대 및 production docs disabled 환경의 machine-readable contract 보강.
- Frontend single-object adapter runtime validation 확대.

## 연결되는 계약

- [[Auth & Credential Safety#2026-05-31 OAuth browser session cookie path]]
- [[Collection System#2026-05-31 JSON collect upload and metadata URI resilience]]
- [[Integration - CLI Backend Frontend#2026-05-31 Sign-out social state reset]]
