---
title: Personal Server Deploy Force Recreate 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - deploy
  - personal-server
  - devops
status: done
related:
  - "[[Personal Server Deploy Shared Adapter 2026-06-08]]"
  - "[[Server IP-only Smoke Evidence 2026-06-05]]"
  - "[[Frontend Notification Actor Public User Contract 2026-06-09]]"
---

# Personal Server Deploy Force Recreate 2026-06-09

> [!success] Status
> 완료. 개인서버 배포 시 source sync 이후 production frontend build가 기존 컨테이너에 남아 최신 소스를 반영하지 못할 수 있는 문제를 막기 위해 app 컨테이너 force-recreate를 배포 스크립트에 추가했다.

## 발견

- `make server-deploy` 는 sync-only 경로라 컨테이너 재시작을 하지 않는다.
- `make server-up` 은 `docker compose up -d postgres backend frontend` 를 실행하지만, 이미 running 상태인 `frontend` 컨테이너는 재생성되지 않을 수 있다.
- Frontend는 `FRONTEND_RUNTIME=production` 에서 컨테이너 시작 시 `npm run build` 후 `npm run start` 를 실행한다.
- 따라서 source만 rsync되고 컨테이너가 재생성되지 않으면 production `.next` output이 이전 build로 남을 위험이 있다.

## 변경

- `agentfeed-dev/scripts/server-deploy.sh`
  - `--up` 경로를 다음 순서로 변경:
    1. `docker compose --env-file .env up -d postgres`
    2. `docker compose --env-file .env up -d --force-recreate backend frontend`
    3. `docker compose --env-file .env ps`
  - 사용 설명에 app 컨테이너 force-recreate 이유를 명시.
- `agentfeed-dev/scripts/test-all.sh`
  - 배포 스크립트가 `--force-recreate backend frontend` 를 유지하는지 guard 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
bash -n scripts/server-deploy.sh scripts/test-all.sh
./scripts/server-deploy.sh --env-file .env.example --remote-root /tmp/agentfeed-test >/tmp/agentfeed-server-deploy-test.txt
grep -q '\[dry-run\] rsync' /tmp/agentfeed-server-deploy-test.txt
grep -q -- '--execute --up' /tmp/agentfeed-server-deploy-test.txt
grep -q -- '--force-recreate backend frontend' scripts/server-deploy.sh
node scripts/check-openapi-contract.mjs
```

- Shell syntax 통과.
- Dry-run 배포 경로 smoke 통과.
- Force-recreate guard 통과.
- OpenAPI contract gate 통과.

## 후속 작업

- [ ] 장기적으로 server deploy smoke가 container creation timestamp 또는 served build id까지 확인하도록 강화한다.
- [ ] IP-only 서버 테스트 환경이 아닌 정식 HTTPS 환경으로 전환할 때 compose 배포 방식과 cache invalidation 정책을 다시 검토한다.

## 실제 배포 결과

- 실행일: 2026-06-09
- 실행 명령:

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
make server-up
```

- 결과:
  - `agentfeed-server-backend-1` 재생성 후 healthy.
  - `agentfeed-server-frontend-1` 재생성 후 healthy.
  - `agentfeed-server-postgres-1` 기존 volume 유지, healthy.
- 배포 후 검증:

```bash
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080/v1 \
  AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
  AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
  NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
  npm run check:api-compatibility
curl -fsS http://161.33.171.81:18080/v1/metadata
curl -fsSI http://161.33.171.81:13030
cd /home/ubuntu/agentfeed/agentfeed-dev && docker compose --env-file .env ps  # server-local path; older off-server SSH notes targeted this same server
```

- Evidence:
  - `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`.
  - API metadata HTTP 200, `contract_version: 2026-06-03`.
  - Frontend HTTP 200 with security headers/CSP.
  - Remote compose ps shows backend/frontend/postgres all healthy.
