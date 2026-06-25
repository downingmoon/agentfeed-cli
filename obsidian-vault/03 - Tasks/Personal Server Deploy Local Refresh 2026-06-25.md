---
title: Personal Server Deploy Local Refresh 2026-06-25
date: 2026-06-25
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - evidence
status: done
aliases:
  - 2026-06-25 현재 서버 로컬 배포
  - 2026-06-25 Personal Server Deploy Local Refresh
---

# Personal Server Deploy Local Refresh 2026-06-25

> [!success]
> 사용자의 명시 요청으로 push 후 현재 서버 내부에서 AgentFeed 최신 작업분을 `/home/ubuntu/agentfeed` 실행 tree에 동기화하고 `agentfeed-server` app 컨테이너를 재생성했다. 이번 배포는 SSH `trading-bot` 경로가 아니라 현재 서버 로컬 배포 경로로 수행했다.

## 중요한 운영 사실

> [!important]
> 현재 Codex 실행 환경은 배포 서버 자체다. `trading-bot`으로 SSH 재접속하지 않는다. 배포는 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` 실행 tree로 로컬 `rsync`하고 `/home/ubuntu/agentfeed/agentfeed-dev`에서 Docker Compose를 실행한다.

- Hostname: `personal`
- Server LAN IP evidence: `10.0.0.248`
- Public server-test URLs:
  - Frontend: `http://161.33.171.81:13030`
  - API: `http://161.33.171.81:18080/v1`
- Compose project: `agentfeed-server`
- Compose file: `/home/ubuntu/agentfeed/agentfeed-dev/compose.yaml`
- Runtime env: `/home/ubuntu/agentfeed/agentfeed-dev/.env`
- Running tree:
  - `/home/ubuntu/agentfeed/agentfeed-dev`
  - `/home/ubuntu/agentfeed/agentfeed-backend`
  - `/home/ubuntu/agentfeed/agentfeed-frontend`
  - `/home/ubuntu/agentfeed/AgentFeed-CLI`
- Working tree:
  - `/home/ubuntu/dev/agentfeed/agentfeed-dev`
  - `/home/ubuntu/dev/agentfeed/agentfeed-backend`
  - `/home/ubuntu/dev/agentfeed/agentfeed-frontend`
  - `/home/ubuntu/dev/agentfeed/agentfeed-cli`

## Push evidence

- `agentfeed-cli`: `main` pushed `dbf19eb..f18f0b6`
- `agentfeed-frontend`: `main` pushed `a84baec..012e430`
- `agentfeed-backend`: `master` pushed `63c918d..5208fb5`
- After push, all three product repos reported `HEAD...origin` count `0 0`.

## Deploy actions

1. 로컬 `rsync --delete`로 working tree를 running tree에 동기화했다.
2. 기존 server `.env`와 DB volume은 유지했다.
3. `/home/ubuntu/agentfeed/agentfeed-dev`에서 `docker compose --env-file .env config`를 검증했다.
4. `postgres`는 유지했고, `backend`와 `frontend`를 `docker compose --env-file .env up -d --force-recreate backend frontend`로 재생성했다.
5. `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행해 CLI deploy tree의 `dist/cli/index.js`를 생성했다.

## Verification evidence

Compose:

```text
agentfeed-server-backend-1    Up 4 minutes (healthy)   0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up 4 minutes (healthy)   0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up 2 weeks (healthy)     127.0.0.1:15432->5432/tcp
```

Frontend production build/start evidence:

```text
✓ Compiled successfully in 19.8s
✓ Generating static pages (18/18)
✓ Ready in 777ms
```

Readiness:

```json
{
  "status": "ready",
  "database": {
    "connected": true,
    "revision": "027_browser_session_version",
    "error": null
  },
  "migration": {
    "head": "027_browser_session_version",
    "up_to_date": true,
    "error": null
  }
}
```

HTTP checks:

- `GET http://127.0.0.1:18080/health/ready` → `200`, ready
- `GET http://161.33.171.81:18080/health/ready` → `200`, ready
- `GET http://161.33.171.81:18080/v1/metadata` → `200`, `api_version=v1`, `contract_version=2026-06-03`, `review_base_url=http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` → `200 OK`
- `HEAD http://161.33.171.81:13030/` → `200 OK`
- `HEAD http://161.33.171.81:13030/feed` → `200 OK`
- `HEAD http://161.33.171.81:13030/projects` → `200 OK`

CLI/API compatibility:

```text
AgentFeed doctor
✓ API: reachable and compatible
✓ API ready: yes (200)
✓ API compatibility: yes (v1 / 2026-06-03)
```

Hosted compatibility smoke:

```text
FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED
BACKEND_METADATA_COMPATIBILITY_PASSED v1 2026-06-03
BACKEND_READINESS_COMPATIBILITY_PASSED
FRONTEND_REVIEW_ORIGIN_MATCHED http://161.33.171.81:13030
FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore
FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03
HOSTED_COMPATIBILITY_SMOKE_PASSED
```

## Notes

> [!warning]
> `/home/ubuntu/agentfeed/agentfeed-frontend/node_modules`는 Docker container run 과정에서 root-owned 상태라 host-side `npm ci`는 `EACCES`가 난다. App container itself is healthy and built successfully. Hosted compatibility smoke의 frontend diagnostic은 dependency가 정상인 working tree `/home/ubuntu/dev/agentfeed/agentfeed-frontend`를 사용했다.

> [!note]
> 이번 배포는 사용자 명시 요청에 따른 1회 예외다. 다음 enterprise-readiness 작업부터는 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약을 재적용한다.

## Related

- [[Runtime Configuration]]
- [[Personal Server Deploy One-off Refresh 2026-06-19]]
- [[Active Tasks]]
