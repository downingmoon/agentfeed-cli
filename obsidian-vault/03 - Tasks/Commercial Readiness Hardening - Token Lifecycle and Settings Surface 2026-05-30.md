---
title: Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30
aliases:
  - Token Lifecycle Settings Surface Hardening
  - 2026-05-30 Token Lifecycle Visibility
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

# Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30

> [!success] 결과
> Backend가 ingestion token lifecycle metadata를 `/v1/ingest/status`와 CLI auth exchange에 노출하고, CLI는 만료/임박 경고를 `login`/`status`/`doctor`에 표시하며, Frontend는 signed-in `/settings` 화면에서 token/integration/settings를 관리합니다.

## 배경

이전 하드닝에서 token expiry 정책은 생겼지만, 사용자가 만료 시점을 미리 확인하거나 웹에서 device token을 audit/revoke하는 surface가 부족했습니다. 상용화 기준에서는 “업로드가 갑자기 401로 실패하기 전”에 CLI와 웹이 같은 token lifecycle 정보를 보여줘야 합니다.

## 범위

- [[Auth & Credential Safety#2026-05-30 Ingestion token lifecycle status|Ingestion token lifecycle status]]
- [[Runtime Configuration#2026-05-30 CLI token expiry visibility|CLI token expiry visibility]]
- [[Integration - CLI Backend Frontend#2026-05-30 Frontend settings/token surface|Frontend settings/token surface]]

## 변경 요약

### Backend

- `get_ingestion_context()`를 추가해 ingestion 인증 결과가 `user`와 `token` metadata를 함께 반환하도록 분리했습니다.
- `GET /v1/ingest/status`가 `response_model=DataResponse[IngestionStatusResponse]`로 user + token lifecycle metadata를 반환합니다.
- 반환 token metadata는 `id`, `name`, `created_at`, `last_used_at`, `expires_at`, `expires_in_seconds`, `expiring_soon`이며 raw token secret은 포함하지 않습니다.
- CLI browser auth exchange 응답에 `token_expires_at`을 추가했습니다.
- `/v1/me/ingestion-tokens` create/list/delete route에 response model을 부여해 Frontend settings surface와 OpenAPI 계약을 고정했습니다.

### CLI

- browser login으로 받은 `token_expires_at`을 `~/.agentfeed/credentials.json`에 저장합니다.
- `AGENTFEED_TOKEN` 환경변수 token은 저장된 token expiry를 오용하지 않도록 expiry metadata를 `null`로 취급합니다.
- `agentfeed login`은 새 token 만료 시점을 표시합니다.
- `agentfeed status`는 저장 credential의 만료 시점과 로컬 기준 만료/임박 경고를 표시합니다.
- `agentfeed doctor`는 `/v1/ingest/status`의 remote token metadata를 우선 사용해 실제 서버 기준 만료/임박 상태를 표시합니다.
- raw token은 계속 출력하지 않습니다.

### Frontend

- signed-in navigation에 `Settings` link를 추가했습니다.
- `/settings` page를 추가해 active CLI token list, revoke action, integration readiness, privacy/notification toggles를 한 화면에 모았습니다.
- OAuth `next` allowlist에 `/settings`를 추가해 로그인 후 원래 settings route로 안전하게 돌아올 수 있게 했습니다.
- Frontend API wrapper에 `me.ingestionTokens()` / `me.revokeIngestionToken(id)`를 추가했습니다.

## 검증

> [!success] 통과한 gate
> - Backend targeted: `uv run --python 3.12 --locked --group dev ruff check app/dependencies.py app/routers/ingest.py app/routers/auth.py app/routers/me.py app/schemas/ingestion.py tests/test_contracts.py`
> - Backend targeted/full contracts: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q` → 110 passed
> - CLI targeted: `npm run build && npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts tests/config.test.ts && npm run typecheck`
> - Frontend targeted: `npm run test:contracts && npm run lint`
> - Frontend production build: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
> - Integration full: `../agentfeed-dev/scripts/test-all.sh`
> - Live smoke: `../agentfeed-dev/scripts/smoke-e2e.sh`

Live smoke 결과:

```text
E2E smoke passed
Verified CLI publish → review API → frontend route → publish → feed for 0f402f1e-b914-4387-9e8c-0b8d29896256
```

## 운영 계약

> [!important]
> token lifecycle metadata는 raw token secret과 다릅니다. API/CLI/Frontend는 expiry/audit metadata를 보여줄 수 있지만, raw `af_live_...` secret은 one-time issue/exchange 응답 외에는 노출하지 않습니다.

- `/v1/ingest/status`는 CLI doctor/preflight의 canonical server-side status입니다.
- `agentfeed status`는 local-only 진단이므로 저장된 expiry만 보여줍니다.
- `agentfeed doctor`는 network validation을 수행하므로 remote status를 우선합니다.
- Frontend settings token revoke는 token secret 없이 id로만 동작합니다.

## 남은 리스크 / 다음 후보

- token rotation 전용 API는 아직 없습니다. 현재 UX는 만료/임박 시 `agentfeed login`으로 새 device token을 발급하는 방식입니다.
- Frontend settings page는 build/type contract와 smoke stack으로 검증했지만, 브라우저 수동 QA에서 revoke/toggle interaction을 한 번 더 확인할 가치가 있습니다.
- token expiry policy 변경 시 CLI 저장 credential schema와 status response schema를 함께 유지해야 합니다.

## 관련 링크

- [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]]
- [[Commercial Readiness Audit 2026-05-30]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks#다음 하드닝 후보]]
