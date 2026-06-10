---
title: Personal Server Deploy Refresh 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - evidence
aliases:
  - 2026-06-10 개인서버 재배포
---

# Personal Server Deploy Refresh 2026-06-10

> [!success]
> 개인서버 `161.33.171.81` 기준 AgentFeed CLI/API/Frontend 최신 로컬 소스를 동기화하고 backend/frontend 컨테이너를 재생성했다.

## Scope

- 요청: 개인서버 배포 1회 수행
- 배포 대상:
  - `AgentFeed-CLI` `main` @ `39334b6`
  - `agentfeed-frontend` `main` @ `46828e1`
  - `agentfeed-backend` `master` @ `8b0c63e`
  - `agentfeed-dev` `main` @ `622293e`
- 서버 테스트 URL:
  - Frontend: `http://161.33.171.81:13030`
  - API: `http://161.33.171.81:18080/v1`

## Actions

1. `make server-deploy`로 4개 repo sync-only 배포를 실행했다.
2. `make server-up`으로 `postgres` 유지, `backend`/`frontend` 컨테이너를 `--force-recreate` 했다.
3. frontend는 컨테이너 시작 직후 `next build`를 수행하므로 초기 외부 `13030` 연결 실패가 있었고, build 완료 후 healthy 상태로 전환됐다.

## Verification Evidence

```text
agentfeed-server-backend-1    Up ... (healthy)  0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up ... (healthy)  0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up ... (healthy)  127.0.0.1:15432->5432/tcp
```

API metadata external check:

```json
{
  "data": {
    "service": "agentfeed-api",
    "api_version": "v1",
    "backend_version": "0.1.0",
    "contract_version": "2026-06-03",
    "review_base_url": "http://161.33.171.81:13030",
    "supported_clients": {
      "cli": { "min_version": "0.2.0", "contract_version": "2026-06-03" },
      "frontend": { "min_version": "0.1.0", "contract_version": "2026-06-03" }
    }
  }
}
```

HTTP checks:

- `GET http://161.33.171.81:18080/v1/metadata` → `200 OK`
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date
- `HEAD http://161.33.171.81:13030/` → `200 OK`
- `HEAD http://161.33.171.81:13030/feed` → `200 OK`
- `HEAD http://161.33.171.81:13030/projects` → `200 OK`

## Follow-up

> [!todo]
> 현재 개인서버는 IP-only HTTP server-test 환경이다. 실제 production 전환 전에는 도메인, HTTPS, OAuth redirect URL, secure cookie/session 정책을 별도 점검해야 한다.

> [!note]
> 이번 작업은 사용자 명시 요청에 따른 예외 배포이며, 기존 enterprise-readiness 반복 작업의 기본 원칙인 “서버/인프라/CICD 보류” 상태를 영구 변경하지 않는다.
