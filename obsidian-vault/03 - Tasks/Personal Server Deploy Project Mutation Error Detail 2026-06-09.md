---
title: Personal Server Deploy Project Mutation Error Detail
date: 2026-06-09
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - agentfeed/frontend
status: done
related:
  - [[Frontend Project Mutation Error Detail 2026-06-09]]
  - [[Runtime Configuration]]
---

# Personal Server Deploy Project Mutation Error Detail 2026-06-09

> [!success] 배포 완료
> [[Frontend Project Mutation Error Detail 2026-06-09]] 변경분을 개인 서버 IP-only server-test stack에 1회 반영했다.

## 대상

- Server: `161.33.171.81`
- Frontend: `http://161.33.171.81:13030`
- API: `http://161.33.171.81:18080/v1`
- Server context: current deployment server local shell (older off-server alias: `trading-bot`)
- Compose project: `agentfeed-server`

## 배포 명령

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
make server-up
cd /home/ubuntu/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate backend frontend && docker compose --env-file .env ps
```

> [!info] Frontend rebuild note
> `compose.yaml`의 Frontend는 `.next`를 named volume으로 유지한다. 최신 source sync 후 production build 반영을 보장하기 위해 `frontend`를 강제 재생성했다. Backend도 최근 readiness 변경분 반영 확실성을 위해 함께 재생성했다.

## 배포 상태

원격 compose 상태:

```text
agentfeed-server-backend-1    Up About a minute (healthy)   0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up 59 seconds (healthy)       0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up 3 days (healthy)           127.0.0.1:15432->5432/tcp
```

## 검증

```bash
curl -fsS http://161.33.171.81:18080/health/ready
curl -fsS http://161.33.171.81:18080/v1/metadata
curl -fsSI http://161.33.171.81:13030/feed

AGENTFEED_ALLOW_INSECURE_API=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
./scripts/smoke-hosted-compatibility.sh
```

결과:

- Backend readiness: `status=ready`, DB connected, migration up-to-date ✅
- Backend metadata: `api_version=v1`, `contract_version=2026-06-03`, `review_base_url=http://161.33.171.81:13030` ✅
- Frontend `/feed`: HTTP `200 OK` ✅
- Hosted compatibility smoke: `HOSTED_COMPATIBILITY_SMOKE_PASSED` ✅

## 주의

> [!warning]
> 이 배포는 개인 서버 IP-only `server-test` 검증이다. HTTPS domain, production secret/proxy/origin 구성, OAuth production app 검증이 완료된 commercial production readiness 증거로 간주하지 않는다.
