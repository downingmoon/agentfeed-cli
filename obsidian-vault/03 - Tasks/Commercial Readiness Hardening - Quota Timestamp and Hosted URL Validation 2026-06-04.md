---
title: Commercial Readiness Hardening - Quota Timestamp and Hosted URL Validation 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Quota timestamp and hosted URL validation
---

# Commercial Readiness Hardening - Quota Timestamp and Hosted URL Validation 2026-06-04

## 목적

상용 운영에서 “언제 다시 시도 가능한지”, “로컬 draft가 시간 데이터를 신뢰할 수 있는지”, “hosted readiness가 runtime과 같은 API URL 규칙을 쓰는지”를 보강했다.

> [!important]
> 이번 변경은 기능 추가보다 운영 실패 모드의 모호함을 줄이는 hardening이다. 실패는 조기에, 원인은 명확하게, 재시도 시점은 절대 시간으로 드러나야 한다.

## 변경 요약

### Backend ingestion quota reset timestamp

- `agentfeed-backend/app/routers/ingest.py`
  - quota 초과 details에 `reset_at` ISO timestamp를 추가했다.
  - 기존 `retry_after_seconds`는 유지해 `Retry-After` header 호환성을 보존했다.
- `agentfeed-backend/tests/test_ingestion_quota.py`
  - count/byte quota 초과 응답에 `reset_at`이 있는지 검증.
  - duplicate source 재사용은 daily quota가 0이어도 quota를 소모하지 않고 기존 worklog를 반환하는 계약을 추가.

### CLI local draft timestamp validation

- `agentfeed-cli/src/draft/validation.ts`
  - `source.created_at`, `source.collection_window.since`, `source.collection_window.until`, `upload.uploaded_at`이 parse 가능한 timestamp인지 검증한다.
  - hand-edited/corrupt draft가 publish/share 흐름으로 넘어가기 전에 명확한 remediation copy로 실패한다.
- `agentfeed-cli/tests/git-draft.test.ts`
  - invalid timestamp draft를 read-time에 거부하는 케이스 추가.

### Frontend hosted readiness API URL normalization

- `agentfeed-frontend/scripts/hosted-readiness-preflight.mjs`
  - hosted readiness에서 API URL query/hash/credentials를 조기 거부한다.
  - runtime `normalizeApiRoot`와 같은 `/v1` root normalization으로 metadata URL을 계산한다.
- `agentfeed-frontend/scripts/hosted-readiness-preflight.contract.test.mjs`
  - query string API URL은 metadata/DNS check 전에 실패하는지 검증.
  - `/v1` API root가 정상 metadata URL로 normalize되는지 검증.

## 검증

> [!success] Fresh local verification
> - Backend: `uv run pytest tests/test_ingestion_quota.py -q` ✅ `7 passed`
> - Backend: `uv run ruff check . && uv run pytest -q` ✅ `387 passed, 1 warning`
> - CLI: `npm test -- --run tests/git-draft.test.ts -t "rejects corrupted local draft shapes"` ✅
> - CLI: `npm run build && npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high` ✅ `396 passed`, `0 vulnerabilities`
> - Frontend: `node scripts/hosted-readiness-preflight.contract.test.mjs && npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` ✅

## 남은 외부 차단 조건

> [!failure]
> 상용 hosted readiness는 아직 외부 인프라 상태 때문에 완료로 볼 수 없다.
> - `api.agentfeed.dev` DNS lookup: `ENOTFOUND`
> - `https://agentfeed.dev/` root: `307 /login`

## 관련 노트

- [[Commercial Readiness Hardening - Cursor Lock and Compatibility UX 2026-06-04]]
- [[Commercial Readiness Hardening - Hosted Readiness Diagnostics 2026-06-04]]
- [[Commercial Readiness Hardening - CLI Release Concurrency Guard 2026-06-04]]
- [[Active Tasks]]
