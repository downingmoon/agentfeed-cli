---
title: Commercial Readiness Hardening - CLI Token Rotation Browser Approval Smoke 2026-06-01
aliases:
  - CLI Token Rotation Browser Approval Smoke
  - Browser Approved Token Replacement Smoke
  - CLI Rotate Hydrated Approval QA
tags:
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - CLI Token Rotation Browser Approval Smoke 2026-06-01

## 목적

[[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]]와 [[Commercial Readiness Hardening - CLI Auth Browser Approval Smoke 2026-06-01]]의 경계를 맞춥니다. Dev smoke가 token replacement session도 실제 hydrated browser approval path로 검증해야 합니다.

> [!warning]
> Token replacement는 기존 ingestion token을 폐기하고 새 token을 발급하는 경계입니다. Direct API approve만 검증하면 UI hydration, cookie auth, approve button wiring, session status transition regression을 놓칠 수 있습니다.

## Acceptance Criteria

- [x] `scripts/smoke-e2e.sh`가 rotation session의 authorize URL을 hydrated browser로 연다.
- [x] DOM에서 `agentfeed-smoke-rotate`, `CLI 세션`, pending 상태, approve button을 검증한다.
- [x] browser click으로 approve 후 metadata endpoint status가 `approved`가 된다.
- [x] exchange 이후 rotation session status가 `consumed`가 된다.
- [x] 기존 token은 401이 되고 새 token은 `/ingest/status`에 성공한다.
- [x] `scripts/test-all.sh` static gate가 rotation browser approval smoke coverage를 감시한다.
- [x] README의 smoke 설명이 token replacement browser approval path와 일치한다.
- [x] targeted/static/live smoke validation이 통과한다.

## 변경 계획

1. `CLI_ROTATE_CREATE_JSON` 이후 direct API approve를 browser DOM approval로 대체.
2. rotate session `approved`/`consumed` 상태 확인을 추가.
3. dev static gate와 README를 업데이트.
4. 검증 후 이 노트와 [[Active Tasks#P1 후보]] 상태를 완료로 전환.

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - CLI Auth Browser Approval Smoke 2026-06-01]]
- [[Auth & Credential Safety]]

## 구현 결과

- `CLI_ROTATE_CREATE_JSON` 이후 direct API approve를 제거하고 hydrated browser authorize page를 열어 metadata와 approve button을 검증합니다.
- `agentfeed-smoke-rotate` device label, pending state, approve click, approved status, exchange 후 consumed status까지 확인합니다.
- 기존 token invalidation과 새 token status check는 기존 smoke 계약 그대로 유지했습니다.
- `scripts/test-all.sh` static gate가 rotate browser approval coverage를 감시합니다.
- `agentfeed-dev/README.md` smoke 설명을 실제 browser approval path와 정렬했습니다.

## 검증 증거

- Targeted syntax/static:
  - `bash -n scripts/smoke-e2e.sh` → passed.
  - `node --check scripts/browser-dom-dump.mjs` → passed.
  - rotate browser approval smoke coverage grep gate → passed.
- Cross-repo integration:
  - `agentfeed-dev ./scripts/test-all.sh` → passed.
  - OpenAPI contract gate: operations 70 / client contracts 67.
  - CLI: 20 files / 280 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 256 pytest, Alembic offline migration chain.
- Live browser E2E:
  - `agentfeed-dev ./scripts/smoke-e2e.sh` → passed.
  - Worklog: `cf14738f-8c05-4be6-8b39-ccfb800022a3`.

> [!success]
> Browser-approved token replacement is now tested through the same hydrated approval UI as first-time CLI login, including approved→consumed state transition and old-token revocation.
