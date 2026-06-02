---
title: Commercial Readiness Hardening - CLI Two Process Publish and OAuth Approval Contract 2026-06-02
aliases:
  - CLI two-process publish smoke
  - OAuth approval code contract smoke recovery
  - Cross-process draft upload verification
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/dev
  - agentfeed/integration
  - agentfeed/reliability
  - agentfeed/auth
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - CLI Two Process Publish and OAuth Approval Contract 2026-06-02

> [!success] 목표
> 같은 local draft를 두 CLI process가 동시에 publish하는 운영 race를 자동 smoke로 고정하고, credential-free OAuth contract smoke가 현재 approval-code API 계약을 검증하도록 복구합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P2 후보]]
- 통합 영역: [[Integration - CLI Backend Frontend#2026-06-02 CLI two-process publish and OAuth approval contract]]
- 이전 CLI lock hardening: [[Commercial Readiness Hardening - CLI Concurrent Publish Serialization 2026-06-02]]
- OAuth contract context: [[Commercial Readiness Hardening - OAuth Contract Smoke and Action Pinning 2026-06-02]]

## 발견한 gap

### CLI publish cross-process proof

이전 lock 구현은 same-process regression과 file lock implementation으로 보호됐지만, 실제 `agentfeed publish` child process 두 개가 같은 draft를 동시에 publish할 때 ingest POST가 하나만 나가는지는 자동 smoke로 고정되어 있지 않았습니다.

### OAuth approval-code contract drift

`make smoke-oauth-contract`를 직접 실행하자 Backend approval endpoint의 현재 계약과 script가 어긋난 것이 드러났습니다.

- 현재 Backend/OpenAPI 계약: `POST /v1/auth/cli/sessions/{session_id}/approve` request body에 `user_code` required.
- 기존 smoke script: callback cookie만 가진 browser client로 `json={}` 승인 요청.
- 결과: `422` validation error로 credential-free OAuth contract smoke 실패.

## 변경 범위

- `AgentFeed-CLI/tests/cli-share.test.ts`
  - `spawn()` 기반 helper를 추가해 실제 built CLI child process 두 개를 동시에 실행합니다.
  - 두 process가 같은 draft id로 `publish --json --no-clipboard`를 실행합니다.
  - mock ingest server는 응답을 지연시켜 race window를 크게 만들고, POST count가 1회인지 검증합니다.
  - 두 process output이 같은 `worklog_two_process` review artifact를 가리키고, 하나는 `reused_existing: true`인지 검증합니다.
  - `.json.upload.lock` cleanup까지 검증합니다.
- `agentfeed-dev/scripts/smoke-oauth-contract.sh`
  - CLI auth session 생성 응답의 `user_code`를 읽어 approval POST body에 전달합니다.
  - session create가 `user_code`를 반환하지 않으면 smoke가 즉시 실패합니다.

## 고정된 계약

- Two CLI publish processes for the same draft issue exactly one `/v1/ingest/worklogs` POST.
- The second process waits for the first process to write upload metadata, then reuses the cached review URL.
- The upload lock file is removed after both processes finish.
- Credential-free OAuth contract smoke validates the human approval-code requirement, not just callback cookie presence.
- OAuth callback still strips raw `session_id` from next state before browser return.
- Exchanged CLI token still passes `/v1/ingest/status`.

## 검증 증거

- GREEN: `npm test -- --run tests/cli-share.test.ts -t 'serializes two publish processes'`
  - 1 test passed; mock ingest POST count stayed at 1.
- GREEN: `npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high`
  - CLI: 21 files / 324 tests passed.
  - Typecheck passed.
  - Release preflight passed.
  - Dependency audit found 0 vulnerabilities.
- RED: `cd ../agentfeed-dev && make smoke-oauth-contract`
  - 실패 원인: `CLI approval with callback cookie failed: 422 ... user_code Field required`.
- GREEN: `cd ../agentfeed-dev && make smoke-oauth-contract`
  - `OAUTH_CONTRACT_SMOKE_PASSED`.
- GREEN: `cd ../agentfeed-dev && ./scripts/test-all.sh`
  - OpenAPI contract gate passed: 70 operations, CLI 6 contracts, frontend 61 contracts.
  - CLI: 324 tests passed, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff passed, 285 pytest passed, alembic offline migration chain generated through `019_audit_events`.
  - GitHub Actions `uses:` SHA pin gate passed.

## 남은 리스크

> [!warning]
> Hosted live OAuth happy-path still requires real GitHub OAuth app credentials and a human/browser consent path. This slice strengthened credential-free contract coverage but did not replace manual live OAuth verification.

다음 상위 후보:

- Hosted OAuth happy-path live smoke를 credentialed CI/release lane으로 승격.
- Live browser hydration smoke를 remote/scheduled artifact gate로 승격.
- Browser interaction harness에서 Settings partial save/token copy/signout recovery를 click-level로 검증.
