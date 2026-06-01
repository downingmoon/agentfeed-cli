---
title: Commercial Readiness Hardening - Readiness Probe Semantics 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/dev
  - agentfeed/backend
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - CLI and dev readiness probe semantics
  - Readiness probe semantics hardening
---

# Commercial Readiness Hardening - Readiness Probe Semantics 2026-06-01

> [!success]
> CLI doctor와 dev smoke가 단순 liveness인 `/health`가 아니라 DB 연결과 migration 상태까지 확인하는 Backend `/health/ready`를 기준으로 동작하도록 정렬했습니다.

## 결과

- CLI `checkApiReachability()`가 `AGENTFEED_API_BASE_URL`의 `/v1` 경로를 root-level `/health/ready`로 정규화해 readiness를 조회합니다.
- CLI `doctor` 출력 label을 `API reachable`에서 `API ready`로 바꿔 failure 의미를 “네트워크 연결 실패”가 아니라 “운영 가능 상태 미충족”까지 포함하도록 명확히 했습니다.
- CLI regression test가 `/health/ready` 요청과 `/health` 미호출을 직접 검증합니다.
- `agentfeed-dev` smoke가 Backend wait를 `/health/ready`로 변경하고, JSON payload의 `status=ready`, `database.connected=true`, `migration.up_to_date=true`를 assert합니다.
- OpenAPI client contract matrix에서 `/health/ready`는 CLI client contract로 승격하고 `/health`는 backend-only liveness endpoint로 분류했습니다.
- wait-ready/test-all/README 문구를 readiness 기준으로 정렬했습니다.

## Product contract

> [!important]
> 사용자-facing CLI와 dev E2E smoke는 “프로세스가 응답한다”가 아니라 “DB와 migration까지 operational ready”를 성공 조건으로 삼아야 합니다. `/health`는 backend-only liveness probe이고, CLI/operational smoke는 `/health/ready`를 사용합니다.

## 변경 파일

- CLI: `src/api/client.ts`
- CLI: `src/cli/index.ts`
- CLI: `tests/api-hook.test.ts`
- CLI: `tests/cli-status-doctor.test.ts`
- Dev: `scripts/smoke-e2e.sh`
- Dev: `scripts/check-openapi-contract.mjs`
- Dev: `scripts/test-all.sh`
- Dev: `scripts/test-wait-ready.sh`
- Dev: `README.md`

## 검증 증거

- RED: `npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts` initially failed because code still called `/health` and doctor still printed `API reachable`.
- CLI targeted: `npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts` → 70 tests passed.
- CLI targeted: `npm run typecheck` → passed.
- Dev targeted: `bash -n scripts/smoke-e2e.sh` → passed.
- Dev targeted: `./scripts/test-wait-ready.sh` → passed.
- Dev targeted: `node scripts/check-openapi-contract.mjs` → passed, 69 OpenAPI operations checked, 66 client contracts checked.
- Cross-repo: `./scripts/test-all.sh` in `agentfeed-dev` → passed.
  - CLI: 20 test files / 272 tests passed, typecheck, release preflight, npm audit.
  - Frontend: CI contract tests, production build, npm audit.
  - Backend: ruff, 246 tests passed, Alembic offline migration chain.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Readiness probe semantics]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Compose Health Readiness 2026-06-01]]
- [[Commercial Readiness Hardening - Frontend CSP and Backend Readiness 2026-06-01]]
