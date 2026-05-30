---
title: Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30
aliases:
  - Token Expiry Provenance Feed UX Hardening
  - 2026-05-30 Token Expiry and CLI Provenance
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30

> [!success] 결과
> Backend ingestion token은 정책 기반 expiry를 갖고, CLI는 credential/API source provenance를 `status`/`doctor`에 보여주며, Frontend feed filter와 share 실패 UX는 사용자가 이해 가능한 상태로 보강되었습니다.

## 범위

- [[Auth & Credential Safety#2026-05-30 Ingestion token expiry policy|Ingestion token expiry policy]]
- [[Runtime Configuration#2026-05-30 CLI credential and API source provenance|CLI credential/API source provenance]]
- [[Integration - CLI Backend Frontend#2026-05-30 Feed filter URL sync|Feed filter URL sync]]
- [[Integration - CLI Backend Frontend#2026-05-30 Worklog share failure feedback|Worklog share failure feedback]]
- [[Integration - CLI Backend Frontend#2026-05-30 Smoke migration readiness|Smoke migration readiness]]

## 변경 요약

### Backend

- `INGESTION_TOKEN_TTL_DAYS` 설정을 추가하고 positive integer validation에 포함했습니다.
- `ingestion_tokens.expires_at` 컬럼과 Alembic migration `008_ingestion_token_expiry`를 추가했습니다.
- token 발급 helper가 quota를 **revoked 되지 않았고 만료되지 않은 token** 기준으로 계산합니다.
- token 인증 dependency는 만료 token을 거부하고 `revoked_at`을 기록합니다.
- `/v1/me/ingestion-tokens`, `/v1/integrations` 응답/조회가 expiry를 반영합니다.
- Alembic 기본 `alembic_version.version_num varchar(32)`에 맞춰 `007_auth_identity_unique`처럼 revision id를 32자 이하로 유지했습니다.

### CLI

- `resolveApiBaseUrlWithMetadata()`와 `loadCredentialsWithMetadata()`를 추가해 source provenance를 API화했습니다.
- `agentfeed status`는 token source, credentials file path, API base source, ignored `.env` warning을 출력합니다.
- `agentfeed doctor`는 같은 provenance와 API reachability를 함께 보여줍니다.
- repo-local `.env`의 non-loopback `AGENTFEED_API_BASE_URL`은 계속 무시하되, silent fallback이 아니라 warning으로 설명합니다.

### Frontend

- `/feed` filter 상태를 query string과 양방향 동기화합니다.
- OAuth `next` allowlist에 feed `category`를 포함해 shareable feed URL이 login redirect에서 보존됩니다.
- `useSearchParams()` client component를 `Suspense`로 감싸 Next prerender 오류를 제거했습니다.
- Worklog card share가 Web Share/clipboard 미지원 시 detail page로 조용히 이동하지 않고 `role="status"` feedback을 표시합니다.

### Dev stack

- `smoke-e2e.sh`가 seed 전에 backend migration을 적용합니다.
- dev compose에 `INGESTION_TOKEN_TTL_DAYS`를 연결해 backend runtime config와 smoke token seed가 같은 정책을 봅니다.

## 검증

> [!success] 통과한 gate
> - CLI: `npm run build && npm test -- --run tests/config.test.ts tests/cli-status-doctor.test.ts && npm run typecheck`
> - CLI full: `npm test -- --run`, `npm run typecheck`, `npm pack --dry-run`, `npm audit --omit=dev --audit-level=moderate`
> - Frontend: `npm run test:contracts`, `npx tsc --noEmit --incremental false`, `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
> - Backend: `uv run --python 3.12 --locked --group dev ruff check .`, `uv run --python 3.12 --locked --group dev pytest tests -q`
> - Integration: `agentfeed-dev/scripts/test-all.sh`
> - Alembic fresh online: temporary Postgres DB + `alembic upgrade head`
> - Live smoke: `agentfeed-dev/scripts/smoke-e2e.sh`

Live smoke 결과:

```text
E2E smoke passed
Verified CLI publish → review API → frontend route → publish → feed for 1e90270b-9476-480c-b3c8-6fbf40b4b878
```

## 주의 / 남은 리스크

> [!warning]
> token expiry가 API 계약에 추가되었으므로, 향후 Frontend settings/token management UI가 생기거나 확장될 때 `expires_at` 표시와 rotation UX를 함께 설계해야 합니다.

- 기존 DB가 006에서 007로 올라갈 때 기본 Alembic version table 길이에 걸리지 않도록 007 revision id를 짧게 바로잡았습니다.
- 이후 Alembic revision id는 `version_num varchar(32)` 호환을 위해 32자 이하를 유지합니다.
- denied native share permission 같은 mobile browser edge case는 자동 테스트가 아니라 수동 QA 후보입니다.

## 관련 링크

- [[Commercial Readiness Audit 2026-05-30]]
- [[Commercial Readiness Hardening - Card Capabilities Rate Limits and Dry Run Safety 2026-05-30]]
- [[Active Tasks#다음 하드닝 후보]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
