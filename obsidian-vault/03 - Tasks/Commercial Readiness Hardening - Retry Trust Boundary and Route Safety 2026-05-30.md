---
title: Commercial Readiness Hardening - Retry Trust Boundary and Route Safety 2026-05-30
aliases:
  - Retry Trust Boundary Route Safety
  - 2026-05-30 P1 Retry API Trust Route Safety
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/frontend
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Retry Trust Boundary and Route Safety 2026-05-30

> [!important] 목표
> 병렬 audit에서 확인된 P1/P2 위험을 닫았습니다: CLI transient upload 실패 복구, CLI API/token trust boundary, Backend public privacy gate, Frontend dynamic route/external URL safety.

## 배경

- CLI upload는 timeout은 있었지만 transient `408/429/5xx/network` 실패를 한 번만 시도해 상용 환경에서 불필요한 실패가 발생할 수 있었습니다.
- CLI는 explicit/env/stored API base가 remote `http:`이면 live token을 cleartext로 보낼 수 있었습니다.
- Browser login은 API가 내려준 `authorize_url`을 검증 없이 열 수 있었습니다.
- Backend published worklog는 privacy gate 통과 후 `PATCH`로 public-facing field를 바꿀 수 있었습니다.
- Backend notification rate-limit rule은 실제 mount path(`/v1/me/notifications`)와 달랐고, public comment query는 soft-deleted author를 필터하지 않았습니다.
- Frontend는 backend/user-provided dynamic route segment를 raw interpolation하고 project repo URL도 중앙 sanitizer 없이 렌더했습니다.

## 구현 요약

### CLI

- `postIngest()`에 bounded transient retry/backoff를 추가했습니다.
  - retry 대상: network failure, timeout, `408`, `429`, `5xx`
  - non-retry: `401`, `413`, `422`, `409`
  - `retry_after_seconds`와 `Retry-After` header를 retry delay hint로 사용합니다.
- `normalizeApiBaseUrl()`에서 remote cleartext `http:`를 기본 차단했습니다.
  - localhost/loopback `http:`는 dev용으로 허용합니다.
  - remote `http:`는 `AGENTFEED_ALLOW_INSECURE_API=1` 명시 opt-in이 필요합니다.
- `createCliAuthSession()` 응답 parser를 추가해 `authorize_url`을 검증합니다.
  - production API는 `https:` AgentFeed/self-host host만 허용합니다.
  - localhost authorize URL은 local API base일 때만 허용합니다.
  - username/password/hash/예상 밖 query를 차단합니다.

> [!warning] CLI credential boundary
> live ingestion token이 붙는 API base는 network call 전에 scheme/host/userinfo/query/hash를 검증해야 합니다. remote cleartext API는 기본값으로 허용하지 않습니다.

### Backend

- `/v1/me/notifications/{id}/read`, `/v1/me/notifications/read-all`에 실제 route와 일치하는 rate-limit rule을 적용했습니다.
- CLI session id, ingestion token id, notification id, username 기반 follow route를 shared bucket path로 normalize합니다.
- `update_worklog()`는 이미 publish된 worklog의 public-facing field 수정을 `WORKLOG_NOT_PUBLISHABLE`로 거부합니다.
- public comment list query에 `User.deleted_at.is_(None)` 필터를 추가했습니다.

### Frontend

- `pathSegment()` helper를 추가하고 API path, notification href, profile/project/worklog internal route에 적용했습니다.
- legacy `/worklog/[id]` redirect도 encoded target으로 이동합니다.
- `safeExternalUrl()` helper를 추가하고 project repository link를 `http/https`, no userinfo, no localhost/private IPv4 조건으로 제한했습니다.
- like/bookmark action은 auth loading 중 redirect하지 않고 대기하며, mutation 실패 시 user-visible error banner를 표시합니다.

> [!tip] Route contract
> backend/user-derived id, username, slug는 path segment로 사용할 때 항상 `pathSegment()`를 거쳐야 합니다. query string은 `URLSearchParams`를 사용합니다.

## 검증 결과

> [!success] Gate 통과
> 세 레포 개별 targeted/full gate와 `agentfeed-dev make test`가 모두 통과했습니다.

- CLI targeted: `npm run typecheck && npm run test -- tests/api-hook.test.ts tests/config.test.ts` → 54 passed
- CLI full: `npm run typecheck && npm test -- --run && npm run build` → 183 passed
- Backend targeted: `uv run ruff check app/middleware/rate_limit.py app/routers/worklogs.py tests/test_contracts.py && uv run pytest -q tests/test_contracts.py -k 'rate_limit or publish or update_rejects_public or public_comments_query'` → 19 passed
- Backend full: `uv run ruff check . && uv run python -m compileall app && uv run pytest -q` → 147 passed
- Frontend targeted: `npm run test:contracts && npm run lint` → passed
- Frontend full: `npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` → passed
- Integration: `make test` in `agentfeed-dev` → passed, including CLI prepack, frontend build, backend pytest, Alembic offline migration chain

## 계약

- CLI upload는 transient failure를 bounded retry하지만 validation/auth/payload/duplicate errors는 retry하지 않습니다.
- CLI remote `http:` API base는 explicit insecure override 없이는 invalid config입니다.
- CLI browser login authorize URL은 expected frontend auth route만 open/print할 수 있습니다.
- Published worklog public fields are immutable in place; changed public content must go through a new reviewed draft path.
- Public comments do not expose soft-deleted user public profiles.
- Frontend internal dynamic route segments are encoded; external project repo links are sanitized before rendering.

## 남은 리스크 / 다음 후보

- Frontend adapter row-level resilience는 아직 별도 P2 후보입니다. malformed API row 하나가 list 전체를 깨지 않도록 safe adapter/filtering을 다음 hardening loop에서 다룰 수 있습니다.
- Backend published worklog 수정 UX는 현재 안전 우선으로 reject합니다. 장기적으로는 re-scan/re-review workflow를 별도 설계해야 합니다.

## 관련 링크

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Privacy Safety]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Soft Delete Auth Intent and CLI Upload Safety 2026-05-30]]
