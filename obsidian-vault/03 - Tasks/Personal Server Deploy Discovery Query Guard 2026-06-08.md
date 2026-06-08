---
title: Personal Server Deploy Discovery Query Guard 2026-06-08
aliases:
  - Personal Server Deploy Discovery Query Guard
status: completed
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - agentfeed/contract
created: 2026-06-08
updated: 2026-06-08
---

# Personal Server Deploy Discovery Query Guard 2026-06-08

## 목적

[[Search Leaderboard Query Contract Guard 2026-06-08]] 변경분을 개인 서버 IP-only stack에 반영하고, hosted API/Frontend/CLI compatibility 및 invalid query fail-closed 동작을 확인했다.

> [!success] 배포 완료
> Backend `ff820e7`, Frontend `92020ce`, CLI/docs `620156f` 기준 변경분을 개인 서버에 sync하고 backend/frontend 컨테이너를 recreate했다. Postgres volume은 유지했다.

## 배포 대상

- Frontend: `http://161.33.171.81:13030`
- Backend API: `http://161.33.171.81:18080/v1`
- Postgres: 서버 loopback `127.0.0.1:15432`

## 수행 절차

1. `make server-deploy`
   - 네 repo sync 완료.
2. `make server-up`
   - 기존 container 상태 확인.
3. `docker compose --env-file .env up -d --force-recreate backend frontend`
   - Backend 코드 reload와 Frontend production `.next` 재빌드를 보장하기 위해 backend/frontend recreate.
4. Frontend healthcheck가 `healthy`가 될 때까지 대기.
5. Hosted smoke 실행.

## 검증

- `make smoke-hosted-compatibility`
  - `FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED`
  - `BACKEND_METADATA_COMPATIBILITY_PASSED v1 2026-06-03`
  - `BACKEND_READINESS_COMPATIBILITY_PASSED`
  - CLI doctor: API reachable/compatible, token missing만 expected attention
  - Frontend diagnostic: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`
  - `HOSTED_COMPATIBILITY_SMOKE_PASSED`
- Invalid discovery query fail-closed smoke:
  - `/v1/search?q=agentfeed&type=bad` → `422`
  - `/v1/leaderboard?type=bad&period=week` → `422`
  - `/v1/leaderboard?type=most_shipped&period=quarter` → `422`
- Frontend root smoke:
  - `http://161.33.171.81:13030/` → `200`

## 후행 과제

> [!note]
> 이번 배포는 owner 요청에 따른 개인 서버 server-test 배포다. Production domain/DNS/HTTPS readiness는 별도 deferred 항목으로 유지한다.

- 실제 사용자 브라우저로 GitHub OAuth login 포함 live smoke는 아직 수동 확인 항목으로 남아 있다.
- Invalid query 422가 UI error boundary/copy에서 충분히 친절한지는 추후 운영 domain smoke 때 확인한다.

## 관련 문서

- [[Active Tasks]]
- [[Search Leaderboard Query Contract Guard 2026-06-08]]
- [[Runtime Configuration]]
