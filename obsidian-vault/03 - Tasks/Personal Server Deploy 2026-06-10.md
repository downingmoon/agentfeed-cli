---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/deploy
  - agentfeed/server-test
status: done
---

# Personal Server Deploy 2026-06-10

> [!success]
> 개인서버 `161.33.171.81` 배포를 수행했고, Frontend/Backend 컨테이너와 hosted compatibility smoke가 통과했다.

## 배포 대상

- Frontend: `http://161.33.171.81:13030`
- Backend API: `http://161.33.171.81:18080/v1`
- Postgres host port: `127.0.0.1:15432`
- SSH host alias: `trading-bot`

## 수행 내용

1. `AgentFeed-CLI` 문서 커밋 `c6aaaf7` push 완료.
2. 4개 레포 상태 확인:
   - `AgentFeed-CLI` `main...origin/main`
   - `agentfeed-frontend` `main...origin/main`
   - `agentfeed-backend` `master...origin/master`
   - `agentfeed-dev` `main...origin/main`
3. `agentfeed-dev/scripts/server-deploy.sh --execute`로 서버에 소스 동기화.
4. `agentfeed-dev/scripts/server-deploy.sh --execute --up`로 app 컨테이너 force-recreate.
5. Frontend Next production build 완료 후 `healthy` 상태 확인.

## 검증 증거

```text
agentfeed-server-backend-1    Up About a minute (healthy)   0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up About a minute (healthy)   0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up 4 days (healthy)           127.0.0.1:15432->5432/tcp
```

Backend metadata:

```json
{
  "service": "agentfeed-api",
  "api_version": "v1",
  "backend_version": "0.1.0",
  "contract_version": "2026-06-03",
  "review_base_url": "http://161.33.171.81:13030"
}
```

Hosted smoke:

```text
FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED
BACKEND_METADATA_COMPATIBILITY_PASSED v1 2026-06-03
BACKEND_READINESS_COMPATIBILITY_PASSED
FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03
HOSTED_COMPATIBILITY_SMOKE_PASSED
```

## 참고

> [!warning]
> 현재는 도메인/HTTPS 없는 개인서버 테스트 배포다. CLI나 브라우저 테스트 시 insecure server-test 설정이 필요할 수 있다.

