---
title: Personal Server Deploy Smoke 2026-06-08
aliases:
  - 2026-06-08 개인서버 배포 smoke
status: done
date: 2026-06-08
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - agentfeed/evidence
---

# Personal Server Deploy Smoke 2026-06-08

> [!success] 배포 완료
> 개인서버 IP-only server-test stack에 `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `AgentFeed-CLI` 디렉터리를 동기화하고 compose stack을 재기동했다.

## 대상

- Frontend: `http://161.33.171.81:13030`
- Backend API: `http://161.33.171.81:18080/v1`
- Environment: IP-only server-test, HTTP 허용 플래그 명시
- CLI pushed head: `b69075c` (`Reject malformed CLI success envelopes`)

## 배포 Evidence

```bash
make server-up
# postgres/backend/frontend Running
# backend healthy, frontend healthy, postgres healthy
```

서비스 상태 요약:

- `agentfeed-server-backend-1`: healthy, `0.0.0.0:18080->8000/tcp`
- `agentfeed-server-frontend-1`: healthy, `0.0.0.0:13030->3000/tcp`
- `agentfeed-server-postgres-1`: healthy, `127.0.0.1:15432->5432/tcp`

## Smoke Evidence

```bash
AGENTFEED_ALLOW_INSECURE_API=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
make smoke-hosted-compatibility
```

통과 항목:

- `FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED`
- `BACKEND_METADATA_COMPATIBILITY_PASSED v1 2026-06-03`
- `BACKEND_READINESS_COMPATIBILITY_PASSED`
- CLI doctor: API reachable and compatible
- `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`
- `HOSTED_COMPATIBILITY_SMOKE_PASSED`

## 주의

> [!warning]
> 이 배포는 도메인/HTTPS production readiness가 아니라 개인서버 IP-only server-test이다. HTTP API는 명시적 insecure server-test flag 하에서만 허용한다.
