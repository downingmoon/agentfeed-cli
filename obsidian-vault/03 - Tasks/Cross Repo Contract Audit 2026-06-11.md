---
title: Cross Repo Contract Audit 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/contract
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
status: completed
aliases:
  - 2026-06-11 CLI Frontend Backend Contract Audit
---

# Cross Repo Contract Audit 2026-06-11

> [!success] 결론
> CLI → Backend → Frontend의 현재 `/v1` API 경로 surface는 일치한다. 이번 audit에서 즉시 수정해야 할 endpoint mismatch는 발견되지 않았다.

## 범위

- CLI repo: `AgentFeed-CLI` `main`
- Frontend repo: `agentfeed-frontend` `main`
- Backend repo: `agentfeed-backend` `master`
- 서버 배포/CICD 변경: 하지 않음

## 확인한 contract surface

### CLI 전용 Backend API

- `GET /v1/metadata`
- `GET /v1/ingest/status`
- `POST /v1/auth/cli/sessions`
- `POST /v1/auth/cli/sessions/{session_id}/exchange`
- `POST /v1/ingest/worklogs/preview`
- `POST /v1/ingest/worklogs`

위 경로는 Backend route에 모두 존재한다.

### Frontend 호출 경로

Frontend `src/lib/api.ts`에서 추출한 53개 `/v1/*` 호출 경로는 모두 Backend route surface에 존재한다.

Backend에만 있는 경로는 다음 목적이라 정상으로 판단한다.

- OAuth redirect/browser entry: `/v1/auth/github`, `/v1/auth/github/callback`
- Health/readiness: `/v1/health`, `/v1/health/ready`
- CLI ingest/auth 전용: `/v1/auth/cli/sessions`, `/v1/auth/cli/sessions/{session_id}/exchange`, `/v1/ingest/status`, `/v1/ingest/worklogs`, `/v1/ingest/worklogs/preview`
- Deprecated/compat boundary: `/v1/ingest/token/rotate`

## 검증 evidence

- Frontend: `npm run lint` 통과 (`tsc --noEmit`)
- Frontend: `npm test` 통과 (`scripts/run-contract-tests.mjs`, exit 0)
- Backend: `uv run pytest -q tests/test_route_response_model_contracts.py tests/test_ingestion_cli_contracts.py tests/test_system_contracts.py tests/test_auth_contracts.py tests/test_worklog_response_model_contracts.py tests/test_dashboard_count_response_model_contracts.py tests/test_public_schema_response_model_contracts.py tests/test_leaderboard_contracts.py` → `62 passed, 1 warning`
- CLI: `npm run typecheck` 통과
- CLI: `npm test -- --run` → `35 passed`, `610 passed`

## 남은 구조 리스크

> [!success] Frontend API facade split 반영됨
> 이 문서가 처음 작성될 때의 `agentfeed-frontend/src/lib/api.ts` size warning은 2026-06-11 후속 split 작업으로 해소됐다. 현재 `src/lib/api.ts`는 public export를 유지하는 facade이며 `50 lines / 49 pure LOC`로 확인했다.

현재 유지해야 할 기준:

1. `api.ts`는 barrel/facade 역할만 유지한다.
2. Transport/envelope parsing은 `api-transport.ts`, `api-response.ts` 책임으로 유지한다.
3. Worklog/project/user/discovery/settings normalizer는 domain별 module에서 fail-closed contract를 유지한다.
4. 새 Frontend API surface를 추가해야 할 때는 Backend schema/route contract와 source-contract test를 먼저 맞춘다.
5. 각 contract slice마다 `npm test`, `npm run lint`, production build 중 관련 검증을 실행한다.

## 관련 문서

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[CLI API Checks Split 2026-06-11]]
