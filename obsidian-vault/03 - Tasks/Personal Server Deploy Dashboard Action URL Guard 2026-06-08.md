---
title: Personal Server Deploy Dashboard Action URL Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - agentfeed/contracts
  - project/tasks
aliases:
  - Dashboard action URL guard server deploy
---

# Personal Server Deploy Dashboard Action URL Guard 2026-06-08

> [!success] 배포 완료
> [[Dashboard Action URL Contract Guard 2026-06-08]] 변경분을 개인 서버 IP-only stack에 반영했다. 기존 `server-up`만으로는 이미 실행 중인 Frontend production build가 stale일 수 있어 backend/frontend 컨테이너를 강제 재생성한 뒤 hosted compatibility smoke를 재실행했다.

## 배포 대상

- Frontend: `http://161.33.171.81:13030`
- Backend API: `http://161.33.171.81:18080/v1`
- Server compose project: `agentfeed-server`

## 수행

```bash
make server-deploy
make server-up
cd /home/ubuntu/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate backend frontend && docker compose --env-file .env ps
```

## 배포 반영 확인

```bash
grep -R "Dashboard action URL must be /worklogs/:id" -n /home/ubuntu/agentfeed/agentfeed-backend/app/schemas/dashboard.py
grep -R "requireDashboardActionUrl" -n /home/ubuntu/agentfeed/agentfeed-frontend/src/lib/api.ts | head
```

확인 결과:

- Backend remote source: `app/schemas/dashboard.py`에 dashboard action URL validator 반영.
- Frontend remote source: `src/lib/api.ts`에 `requireDashboardActionUrl()` parser 반영.

## Smoke Evidence

```bash
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
./scripts/smoke-hosted-compatibility.sh
```

- Frontend deployment compatibility: 통과.
- Backend metadata compatibility: `v1 / 2026-06-03` 통과.
- Backend readiness: 통과.
- CLI doctor hosted API: `API ready: yes (200)`, `API compatibility: yes (v1 / 2026-06-03)`.
- Frontend diagnostic compatibility helper: `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`.
- 최종 marker: `HOSTED_COMPATIBILITY_SMOKE_PASSED`.

Evidence artifact:

- `agentfeed-dev/.commercial-readiness-evidence/20260608T140033Z-dashboard-action-url-deploy-recreate/hosted-compatibility-evidence.json`

## 운영 주의

> [!warning]
> `make server-up`은 이미 Running인 컨테이너를 재생성하지 않을 수 있다. Frontend production build 반영이 필요한 배포에서는 `docker compose --env-file .env up -d --force-recreate backend frontend` 또는 배포 스크립트 개선이 필요하다.
