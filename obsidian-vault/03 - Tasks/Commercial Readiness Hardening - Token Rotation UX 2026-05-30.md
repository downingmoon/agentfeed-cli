---
title: Commercial Readiness Hardening - Token Rotation UX 2026-05-30
aliases:
  - Token Rotation UX Hardening
  - 2026-05-30 Ingestion Token Rotation
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/auth
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Token Rotation UX 2026-05-30

> [!important] 목표
> Token expiry visibility가 생긴 뒤 남은 UX gap은 “만료/임박 token을 어떻게 안전하게 교체하느냐”였습니다. 이번 작업은 Backend → CLI → Frontend가 같은 rotation contract를 공유하게 만드는 P1 hardening입니다.

## 배경

[[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]에서 token 만료 시점과 settings token list/revoke는 보이게 되었지만, 사용자는 여전히 새 login을 다시 해야 했고 quota limit에 걸린 계정은 기존 token revoke 후 재발급이 필요했습니다. Rotation은 기존 device token을 즉시 revoke하고 새 one-time secret을 발급하는 복구 경로입니다.

## 변경 범위

- [[Auth & Credential Safety#2026-05-30 Ingestion token rotation contract|Ingestion token rotation contract]]
- [[Runtime Configuration#2026-05-30 CLI token rotation command|CLI token rotation command]]
- [[Integration - CLI Backend Frontend#2026-05-30 Token rotation end-to-end contract|Token rotation end-to-end contract]]

## 계약

> [!warning] Secret exposure boundary
> Raw `af_live_...` secret은 rotation 응답 한 번에만 포함됩니다. status/list/doctor/revoke response에는 계속 포함하지 않습니다.

- Backend는 현재 ingestion token 기준 rotation endpoint와 signed-in settings 관리용 rotation endpoint를 모두 제공합니다.
- Rotation은 old token을 먼저 revoke하고 replacement token을 같은 transaction에서 생성합니다.
- Replacement는 quota-at-limit user도 복구할 수 있어야 하므로 “새 token 발급 전 quota check”가 아니라 “기존 token revoke + 새 token 생성”으로 처리합니다.
- CLI `agentfeed rotate`는 saved token을 API로 교체하고 raw secret을 출력하지 않습니다.
- CLI saved token이 invalid/expired이면 browser login replacement flow로 fallback합니다.
- `AGENTFEED_TOKEN` 환경변수 source는 CLI가 값을 수정할 수 없으므로 in-place rotation을 거부하고 browser fallback 안내를 출력합니다.
- Frontend `/settings`는 active token card에서 rotate action을 제공하고, 새 secret은 one-time notice로만 표시합니다.

## 구현 요약

### Backend

- `rotate_ingestion_token()` service helper 추가.
- `POST /v1/ingest/token/rotate` 추가: 현재 CLI token을 bearer auth context 기준으로 rotate합니다.
- `POST /v1/me/ingestion-tokens/{token_id}/rotate` 추가: signed-in user가 Settings에서 특정 token을 rotate합니다.
- `RotatedIngestionTokenResponse` schema로 one-time secret, replacement id, `rotated_from`, `rotated_at`, expiry metadata를 고정했습니다.
- 두 rotate mutation 모두 rate-limit critical path에 포함했습니다.

### CLI

- `agentfeed rotate`와 alias `agentfeed token rotate` 추가.
- `agentfeed status` / `doctor`의 expiry warning remediation을 `agentfeed rotate`로 바꿨습니다.
- Rotation 성공 시 새 raw token은 credential file에 저장하지만 stdout에는 출력하지 않습니다.
- browser fallback은 `agentfeed rotate --browser`로 명시적으로도 실행할 수 있습니다.
- README install/login 섹션에 rotation UX를 추가했습니다.

### Frontend

- API wrapper `me.rotateIngestionToken(id)` 추가.
- `/settings` token card에 `Rotate token` action 추가.
- Rotation 성공 후 token list를 재조회하고, 새 one-time token secret을 warning-styled card로 보여줍니다.
- Secret 안내 문구는 browser persistence가 아니라 one-time display boundary를 강조합니다.

## 검증 결과

> [!success] 통과한 gate
> Backend/CLI/Frontend targeted gate와 dev 통합 smoke가 모두 통과했습니다.

- Backend targeted/full contracts:
  - `uv run --python 3.12 --locked --group dev ruff check app/services/ingestion_tokens.py app/routers/ingest.py app/routers/me.py app/middleware/rate_limit.py app/schemas/ingestion.py tests/test_contracts.py`
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q` → 113 passed
- CLI targeted:
  - `npm run build && npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts tests/config.test.ts && npm run typecheck` → 46 passed
- Frontend targeted:
  - `npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- Integration full:
  - `../agentfeed-dev/scripts/test-all.sh` → CLI 166 tests, Frontend build/audit, Backend 126 tests, Alembic offline chain passed
  - `../agentfeed-dev/scripts/smoke-e2e.sh` → E2E smoke passed

Live smoke 결과:

```text
E2E smoke passed
Verified CLI publish → review API → frontend route → publish → feed for 2b67ed06-7c4d-43d7-853d-aec4126af9a7
```

## 남은 리스크

- Browser 수동 QA에서 Settings rotate → CLI `agentfeed login --token <token>` handoff를 한 번 더 확인할 가치가 있습니다.
- CLI invalid/expired token fallback은 automated API mock으로 검증하되, 실제 OAuth provider round-trip은 dev smoke 계정 상태에 의존합니다.

## 관련 링크

- [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks#다음 하드닝 후보]]
