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

> [!warning] Frontend API client size
> `agentfeed-frontend/src/lib/api.ts`는 3,059 lines / 약 2,709 pure LOC로 과대하다. Contract tests가 충분히 있으므로 다음 refactor 단위에서 public export를 유지한 채 domain별 module로 분리하는 것이 좋다.

권장 순서:

1. `api.ts`를 barrel/facade로 줄이고 public export contract를 유지한다.
2. Transport/envelope parsing을 별도 module로 분리한다.
3. Types/constants를 `api-types` 계층으로 분리한다.
4. Worklog/project/user/discovery/settings normalizer를 domain별로 분리한다.
5. Endpoint client 객체(`auth`, `worklogs`, `projects`, `me`, `search`, `explore`, `integrations`)를 route-group별 파일로 분리한다.
6. 각 단계마다 `npm run lint && npm test`를 실행한다.

## 관련 문서

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[CLI API Checks Split 2026-06-11]]
