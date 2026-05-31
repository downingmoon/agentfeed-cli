---
title: Commercial Readiness Hardening - Rate Limit Fallback Detail Payload Resilience and Credential Fallback Warning 2026-05-31
aliases:
  - Rate Limit Fallback Detail Payload Credential Warning
  - 2026-05-31 Rate Limit Detail Credential Hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - hardening
status: verified
created: 2026-05-31
---

# Commercial Readiness Hardening - Rate Limit Fallback Detail Payload Resilience and Credential Fallback Warning 2026-05-31

관련: [[AgentFeed CLI MOC]], [[Auth & Credential Safety]], [[Integration - CLI Backend Frontend]], [[Runtime Configuration]], [[Active Tasks]]

> [!abstract] 목표
> 상용 환경에서 운영 의존성 장애나 partial API payload가 사용자 흐름을 blank/500으로 끊지 않도록 Backend rate-limit fallback, Frontend detail/review payload resilience, CLI credential fallback warning을 보강했습니다.

## 수정 범위

### Backend — DB rate-limit store fallback

> [!success]
> database-backed rate-limit store가 일시적으로 실패해도 request middleware가 raw 500으로 끊기지 않고 process-local limiter로 degrade합니다.

계약:

- production에서는 기본적으로 shared database rate-limit store를 계속 사용합니다.
- store check가 예외를 던지면 warning log를 남기고 process-local in-memory limiter로 같은 bucket/identity/rule을 재평가합니다.
- fallback도 quota를 적용하므로 완전한 fail-open이 아니라 per-process best-effort throttle입니다.

### Frontend — single-object/detail payload resilience

> [!success]
> list row isolation 밖에 있던 worklog detail/review 단일 객체 경로를 fail-safe 처리했습니다.

계약:

- `adaptWorklog()`는 non-object/missing required card shape를 `Malformed worklog payload`로 거부하고 detail page의 기존 error fallback으로 보냅니다.
- Review page는 `worklog`/`preview` nested payload가 없는 응답을 렌더링 전에 거부합니다.
- malformed privacy finding severity는 fail-closed blocking으로 처리합니다.
- `preview.public_fields`는 string list로 normalize한 뒤 badge를 렌더링합니다.

### CLI — keychain fallback warning provenance

> [!success]
> `AGENTFEED_CREDENTIAL_STORE=auto`가 OS keychain을 사용할 수 없어 private credentials file로 fallback할 때 사용자와 이후 `status`/`doctor`에 경고가 남습니다.

계약:

- explicit `file` 저장은 기존처럼 warning 없이 동작합니다.
- explicit `keychain` 저장 실패는 계속 fail-closed입니다.
- `auto` fallback은 `credential_store_warning`을 private credentials metadata에 저장합니다.
- saved login 직후, `status`, `doctor`에서 warning을 확인할 수 있습니다.

## 검증 증거

- CLI: `npm test -- --run tests/config.test.ts tests/cli-status-doctor.test.ts` → 31 passed
- CLI: `npm run typecheck && npm test -- --run` → 19 files / 248 tests passed
- Backend: `uv run --python 3.12 --locked --group dev pytest tests/test_rate_limit_store.py -q` → 9 passed
- Backend: `uv run --python 3.12 --locked --group dev ruff check app/middleware/rate_limit.py tests/test_rate_limit_store.py && uv run --python 3.12 --locked --group dev pytest -q` → 208 passed, 1 warning
- Frontend: `npm run test:contracts && npm run lint` → passed
- Frontend: `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8001/v1 npm run build` → passed
- All touched repos: `git diff --check` → passed

## 남은 상용화 후보

> [!warning]
> 아직 전체 목표 완료로 보지는 않습니다. 아래 항목은 별도 루프에서 계속 줄여야 합니다.

- Backend route-level `response_model` coverage 확대와 schema contract regression.
- CLI `share --json` clipboard/open/failure side-effect 테스트 보강.
- Auth `currentUser` boundary normalization.
- 실제 dev stack smoke 재실행으로 이번 변경이 운영 흐름에 미치는 영향 확인.

## 연결되는 계약

- [[Runtime Configuration#2026-05-31 Database rate-limit store process-local fallback]]
- [[Integration - CLI Backend Frontend#2026-05-31 Frontend detail and review payload resilience]]
- [[Auth & Credential Safety#2026-05-31 Keychain auto fallback warning provenance]]
