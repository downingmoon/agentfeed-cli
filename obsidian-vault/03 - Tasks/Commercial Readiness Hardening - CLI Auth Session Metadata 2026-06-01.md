---
title: Commercial Readiness Hardening - CLI Auth Session Metadata 2026-06-01
aliases:
  - CLI Auth Session Metadata
  - Browser Login Session Verification
  - CLI Approval Metadata Hardening
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - CLI Auth Session Metadata 2026-06-01

## 목적

CLI browser login 승인 화면이 URL의 opaque `session_id`만 믿고 바로 approve하는 대신, Backend가 가진 CLI auth session metadata를 먼저 확인하고 사용자에게 표시하도록 만듭니다.

> [!danger]
> Browser approval은 terminal에 ingestion token을 발급하는 경계입니다. 사용자가 승인하는 session의 존재 여부, 상태, 기기, 만료 시간을 확인할 수 있어야 하고, expired/consumed session은 fail-closed로 처리되어야 합니다.

## 변경 사항

### Backend

- `GET /v1/auth/cli/sessions/{session_id}` 추가.
- 응답 모델 `CliAuthSessionStatusResponse` 추가.
- 공개 metadata는 `session_id`, `status`, `device_name`, `created_at`, `expires_at`, `approved_at`, `consumed_at`, `poll_interval_seconds`로 제한했습니다.
- `verifier_hash`, `user_id`, token 정보는 노출하지 않습니다.
- expired 여부는 읽기 요청에서 계산하되 row mutation/commit은 하지 않습니다.
- 해당 GET endpoint를 IP-based rate-limit rule에 추가했습니다.

### Frontend

- `cliAuth.session(sessionId)` API adapter 추가.
- `/cli/authorize` 화면이 승인 버튼 노출 전에 session metadata를 가져와 검증합니다.
- pending session이면 기기/상태/만료 시간을 표시합니다.
- expired session은 재실행 안내로 차단합니다.
- approved/consumed session은 이미 승인 완료 상태로 표시합니다.

### Dev contract gate

- OpenAPI client endpoint 목록에 Frontend `GET /v1/auth/cli/sessions/{session_id}` 계약을 추가했습니다.

## 검증 증거

- Backend targeted: `ruff check app/routers/auth.py app/schemas/auth.py app/middleware/rate_limit.py tests/test_contracts.py` → passed.
- Backend targeted: CLI auth metadata/route/response-model/rate-limit tests → 5 passed.
- Frontend: `npm run test:contracts && npm run lint` → passed.
- Dev OpenAPI gate: `node scripts/check-openapi-contract.mjs` → passed, operations 70 / client contracts 67.

> [!success]
> 최종 `agentfeed-dev ./scripts/test-all.sh`까지 통과했습니다. CLI auth approval metadata 계약이 Backend/Frontend/Dev gate에 반영됐습니다.

## 최종 통합 검증

- `agentfeed-dev ./scripts/test-all.sh` → passed.
  - OpenAPI: operations 70 / client contracts 67.
  - CLI: 20 files / 280 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 256 pytest, Alembic offline migration chain.

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Parallel P1 Audit Hardening 2026-06-01]]
- [[Auth & Credential Safety]]
