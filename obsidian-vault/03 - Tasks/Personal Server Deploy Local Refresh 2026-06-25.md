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


## 2026-06-25 — Post source assertion splits threshold deploy

### Trigger

5-commit threshold crossed after API boundary and discovery/dashboard source assertion helper splits. Pushed and deployed from current server local shell. No SSH to `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `3b1f4c9` — `Split API boundary source assertions`
- `agentfeed-frontend` `bc8890a` — `Split discovery dashboard source assertions`
- `agentfeed-cli` `d38922f` — `Document API boundary source assertion split`
- `agentfeed-cli` `2032046` — `Document discovery dashboard source assertion split`
- `agentfeed-dev` `89e12bc` — `Log API boundary source assertion split`
- `agentfeed-dev` `2f1878a` — `Log discovery dashboard source assertion split`
- `agentfeed-dev` `dc86ee1` — `Fix discovery dashboard docs commit hash`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files.
- Recreated `backend` and `frontend`; kept Postgres volume/container.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- Hosted compatibility smoke passed after setting `AGENTFEED_CLI_DIR=/home/ubuntu/dev/agentfeed/agentfeed-cli`. Initial attempt failed only because default script path expected `/home/ubuntu/dev/agentfeed/AgentFeed-CLI`.
- CLI doctor inside hosted smoke reached API and confirmed compatibility; account/project attention expected in temp cwd with no token/config.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next commit counter starts after this deploy docs commit.


## 2026-06-25 — Post settings/feed source assertion splits threshold deploy

### Trigger

Settings and feed source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `00f382f` — `Split settings source assertions`
- `agentfeed-frontend` `16c6313` — `Split feed source assertions`
- `agentfeed-cli` `38e1b52` — `Document settings source assertion split`
- `agentfeed-cli` `16ec17b` — `Document feed source assertion split`
- `agentfeed-dev` `2a93900` — `Log settings source assertion split`
- `agentfeed-dev` `902a833` — `Log feed source assertion split`

### Push ranges

- `agentfeed-frontend`: `bc8890a..16c6313`
- `agentfeed-cli`: `ae57d52..16ec17b`
- `agentfeed-dev`: `4c37b83..902a833`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` and Postgres volume/container.
- Recreated `backend` and `frontend`.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy after wait-ready.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` because this dev server uses HTTP IP URLs.
- Runtime CLI build passed: `npm ci && npm run build`, 0 vulnerabilities.

### Deployment notes

- First hosted smoke attempt failed only because CLI doctor rejects plain HTTP non-localhost API URLs unless `AGENTFEED_ALLOW_INSECURE_API=1` is explicitly set.
- Second hosted smoke attempt reached API but frontend diagnostic failed because runtime host `agentfeed-frontend/node_modules` was root-owned and incomplete for host-side `npm run check:api-compatibility`.
- Fixed host-side runtime frontend dependency state with `sudo chown -R ubuntu:ubuntu /home/ubuntu/agentfeed/agentfeed-frontend/node_modules` then `npm ci`; final hosted smoke passed.

### Follow-up

- [x] 5-commit threshold push/deploy handled for settings/feed source assertion splits.
- [x] Next source assertion helper re-scan candidate `worklog-card-source-assertions.ts` handled by [[Frontend Worklog Card Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `auth-shell-source-assertions.ts` handled by [[Frontend Auth Shell Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `cli-authorize-source-assertions.ts` handled by [[Frontend CLI Authorize Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `api-boundary-enum-source-assertions.ts` handled by [[Frontend API Boundary Enum Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `brand-assets-source-assertions.ts` handled by [[Frontend Brand Assets Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `profile-page-source-assertions.ts` handled by [[Frontend Profile Page Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `project-detail-source-assertions.ts` handled by [[Frontend Project Detail Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `shell-source-assertions.ts` handled by [[Frontend Shell Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `api-boundary-worklog-source-assertions.ts` handled by [[Frontend API Boundary Worklog Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `worklog-review-page-source-assertions.ts` handled by [[Frontend Worklog Review Page Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `project-source-assertions.ts` handled by [[Frontend Project Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `search-source-assertions.ts` handled by [[Frontend Search Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `review-public-user-assets-source-assertions.ts` handled by [[Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `dashboard-source-assertions.ts` handled by [[Frontend Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidates `worklog-card-list-source-assertions.ts` and `notifications-source-assertions.ts` handled by [[Frontend Worklog Card List Source Assertion Helper Split 2026-06-25]] and [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post worklog-card/auth-shell source assertion splits threshold deploy

### Trigger

Worklog-card and auth-shell source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `a5bb6d2` — `Split worklog card source assertions`
- `agentfeed-frontend` `f57aaec` — `Split auth shell source assertions`
- `agentfeed-cli` `e29c8cd` — `Document worklog card source assertion split`
- `agentfeed-cli` `fbc0edd` — `Document auth shell source assertion split`
- `agentfeed-dev` `c1d82b7` — `Log worklog card source assertion split`
- `agentfeed-dev` `5cca824` — `Log auth shell source assertion split`

### Push ranges

- `agentfeed-frontend`: `16c6313..f57aaec`
- `agentfeed-cli`: `a747a33..fbc0edd`
- `agentfeed-dev`: `c4a4094..5cca824`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` and Postgres volume/container.
- Recreated `backend` and `frontend`.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy after wait-ready.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` because this dev server uses HTTP IP URLs.
- Runtime CLI build passed: `npm ci && npm run build`, 0 vulnerabilities.

### Follow-up

- [x] 5-commit threshold push/deploy handled for worklog-card/auth-shell source assertion splits.
- [ ] Next source assertion helper re-scan candidate is `cli-authorize-source-assertions.ts` at 76 pure LOC.
- [ ] Next commit counter starts after this deploy docs commit.












## 2026-06-25 — Post API-boundary project-dashboard/settings-profile source assertion splits threshold deploy

### Trigger

API-boundary project-dashboard and settings-profile source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from the current server local shell. Current server is `trading-bot`; no SSH was used because Codex was already running on that server.

### Push 범위

- `agentfeed-frontend` `082708f..d178a46`
- `agentfeed-cli` `2231640..59f2545`
- `agentfeed-dev` `5b70c62..2201845`

### Deploy 범위

- Synced working tree `/home/ubuntu/dev/agentfeed` into runtime tree `/home/ubuntu/agentfeed` with `rsync --delete`, preserving runtime `.env` files.
- Recreated `backend` and `frontend` containers with Docker Compose from `/home/ubuntu/agentfeed/agentfeed-dev`.
- Preserved existing Postgres container/volume.
- Rebuilt runtime CLI in `/home/ubuntu/agentfeed/AgentFeed-CLI` with `npm ci && npm run build`.

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy after frontend health settled from initial `starting`.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅ — AgentFeed dev stack ready.
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date.
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`.
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`.
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities.

### Commits deployed

- `agentfeed-frontend` `697817e` — `Split API boundary project dashboard source assertions`
- `agentfeed-frontend` `d178a46` — `Split settings profile source assertions`
- `agentfeed-cli` `e723dbb` — `Document API boundary project dashboard source assertion split`
- `agentfeed-cli` `59f2545` — `Document settings profile source assertion split`
- `agentfeed-dev` `f811bd4` — `Log API boundary project dashboard source assertion split`
- `agentfeed-dev` `2201845` — `Log settings profile source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [ ] Next source assertion helper candidate is 31 pure LOC: `feed-hook-a11y-source-assertions.ts`.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post settings-shell/moderation-reports source assertion splits threshold deploy

### Trigger

Settings-shell and moderation-reports source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from the current server local shell. Current server is `trading-bot`; no SSH was used because Codex was already running on that server.

### Push 범위

- `agentfeed-frontend` `1036b6b..082708f`
- `agentfeed-cli` `18547bf..c0201d5`
- `agentfeed-dev` `1bfc448..f4fbf91`

### Deploy 범위

- Synced working tree `/home/ubuntu/dev/agentfeed` into runtime tree `/home/ubuntu/agentfeed` with `rsync --delete`, preserving runtime `.env` files.
- Recreated `backend` and `frontend` containers with Docker Compose from `/home/ubuntu/agentfeed/agentfeed-dev`.
- Preserved existing Postgres container/volume.
- Rebuilt runtime CLI in `/home/ubuntu/agentfeed/AgentFeed-CLI` with `npm ci && npm run build`.

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy after frontend health settled from initial `starting`.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅ — AgentFeed dev stack ready.
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date.
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`.
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`.
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities.

### Commits deployed

- `agentfeed-frontend` `2f09869` — `Split settings shell source assertions`
- `agentfeed-frontend` `082708f` — `Split moderation reports source assertions`
- `agentfeed-cli` `74c72af` — `Document settings shell source assertion split`
- `agentfeed-cli` `c0201d5` — `Document moderation reports source assertion split`
- `agentfeed-dev` `64cc964` — `Log settings shell source assertion split`
- `agentfeed-dev` `f4fbf91` — `Log moderation reports source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper candidate `api-boundary-project-dashboard-source-assertions.ts` handled by [[Frontend API Boundary Project Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post API-boundary visibility/worklog-detail-accessibility source assertion splits threshold deploy

### Trigger

API-boundary visibility/integration and worklog-detail-accessibility source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from the current server local shell. Current server is `trading-bot`; no SSH was used because Codex was already running on that server.

### Push 범위

- `agentfeed-frontend` `71ebf27..1036b6b`
- `agentfeed-cli` `7fb6ea2..64b6764`
- `agentfeed-dev` `337c69a..3d09788`

### Deploy 범위

- Synced working tree `/home/ubuntu/dev/agentfeed` into runtime tree `/home/ubuntu/agentfeed` with `rsync --delete`, preserving runtime `.env` files.
- Recreated `backend` and `frontend` containers with Docker Compose from `/home/ubuntu/agentfeed/agentfeed-dev`.
- Preserved existing Postgres container/volume.
- Rebuilt runtime CLI in `/home/ubuntu/agentfeed/AgentFeed-CLI` with `npm ci && npm run build`.

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy after frontend health settled from initial `starting`.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅ — AgentFeed dev stack ready.
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date.
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`.
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`.
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities.

### Commits deployed

- `agentfeed-frontend` `efece1f` — `Split API boundary visibility integration source assertions`
- `agentfeed-frontend` `1036b6b` — `Split worklog detail accessibility source assertions`
- `agentfeed-cli` `9fb252a` — `Document API boundary visibility integration source assertion split`
- `agentfeed-cli` `64b6764` — `Document worklog detail accessibility source assertion split`
- `agentfeed-dev` `12f36db` — `Log API boundary visibility integration source assertion split`
- `agentfeed-dev` `3d09788` — `Log worklog detail accessibility source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper candidate `api-boundary-project-dashboard-source-assertions.ts` handled by [[Frontend API Boundary Project Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post landing-preview/settings-token source assertion splits threshold deploy

### Trigger

Landing-preview and settings-token source assertion helper split docs brought the post-deploy unpushed counter to 5 commits. Pushed and deployed from the current server local shell. Current server is `trading-bot`; no SSH was used because Codex was already running on that server.

### Push 범위

- `agentfeed-frontend` `8cbf981..71ebf27`
- `agentfeed-cli` `a426de4..5ab1841`
- `agentfeed-dev` `59dabe7..a76d5f8`

### Deploy 범위

- Synced working tree `/home/ubuntu/dev/agentfeed` into runtime tree `/home/ubuntu/agentfeed` with `rsync --delete`, preserving runtime `.env` files.
- Recreated `backend` and `frontend` containers with Docker Compose from `/home/ubuntu/agentfeed/agentfeed-dev`.
- Preserved existing Postgres container/volume.
- Rebuilt runtime CLI in `/home/ubuntu/agentfeed/AgentFeed-CLI` with `npm ci && npm run build`.

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy after frontend health settled from initial `starting`.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅ — AgentFeed dev stack ready.
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date.
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`.
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`.
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities.

### Commits deployed

- `agentfeed-frontend` `8b4d89e` — `Split landing preview source assertions`
- `agentfeed-frontend` `71ebf27` — `Split settings token source assertions`
- `agentfeed-cli` `f3b7b18` — `Document landing preview source assertion split`
- `agentfeed-cli` `5ab1841` — `Document settings token source assertion split`
- `agentfeed-dev` `a76d5f8` — `Log landing settings token source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Current server identity documented: `trading-bot` is this server; do not SSH to it from this environment.
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post worklog-card-list/notifications source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버에서 직접 작업 중이므로 `trading-bot` SSH를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `bf5b97b..8cbf981`
- `agentfeed-cli` `3ca44f7..c3ee090`
- `agentfeed-dev` `bd970dd..6b5c0d9`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `418a504` — `Split worklog card list source assertions`
- `agentfeed-frontend` `8cbf981` — `Split notifications source assertions`
- `agentfeed-cli` `2358e0a` — `Document worklog card list source assertion split`
- `agentfeed-cli` `c3ee090` — `Document notifications source assertion split`
- `agentfeed-dev` `6b5c0d9` — `Log worklog card notifications source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post review-public-user-assets/dashboard source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버에서 직접 작업 중이므로 `trading-bot` SSH를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `c1bedfc..bf5b97b`
- `agentfeed-cli` `1ea081a..3f968d6`
- `agentfeed-dev` `c6fb128..dec20c5`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `6ee062c` — `Split review public user asset source assertions`
- `agentfeed-frontend` `bf5b97b` — `Split dashboard source assertions`
- `agentfeed-cli` `1cbe70f` — `Document review public user asset source assertion split`
- `agentfeed-cli` `3f968d6` — `Document dashboard source assertion split`
- `agentfeed-dev` `55fb7dd` — `Log review public user asset source assertion split`
- `agentfeed-dev` `dec20c5` — `Log dashboard source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper candidates `worklog-card-list-source-assertions.ts` and `notifications-source-assertions.ts` handled by [[Frontend Worklog Card List Source Assertion Helper Split 2026-06-25]] and [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post project/search source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버에서 직접 작업 중이므로 `trading-bot` SSH를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `60d5bc1..c1bedfc`
- `agentfeed-cli` `170f1aa..8d3d429`
- `agentfeed-dev` `6f3a66a..6373390`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `56c0285` — `Split project source assertions`
- `agentfeed-frontend` `c1bedfc` — `Split search source assertions`
- `agentfeed-cli` `27994f5` — `Document project source assertion split`
- `agentfeed-cli` `8d3d429` — `Document search source assertion split`
- `agentfeed-dev` `ebd4a50` — `Log project source assertion split`
- `agentfeed-dev` `6373390` — `Log search source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper re-scan candidate `review-public-user-assets-source-assertions.ts` handled by [[Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `dashboard-source-assertions.ts` handled by [[Frontend Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidates `worklog-card-list-source-assertions.ts` and `notifications-source-assertions.ts` handled by [[Frontend Worklog Card List Source Assertion Helper Split 2026-06-25]] and [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post API-boundary-worklog/worklog-review-page source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버에서 직접 작업 중이므로 `trading-bot` SSH를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `dcdba7c..60d5bc1`
- `agentfeed-cli` `0f55904..64058f3`
- `agentfeed-dev` `7a878e3..ce773e4`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `430b864` — `Split API boundary worklog source assertions`
- `agentfeed-frontend` `60d5bc1` — `Split worklog review page source assertions`
- `agentfeed-cli` `bb66f52` — `Document API boundary worklog source assertion split`
- `agentfeed-cli` `64058f3` — `Document worklog review page source assertion split`
- `agentfeed-dev` `77acd25` — `Log API boundary worklog source assertion split`
- `agentfeed-dev` `ce773e4` — `Log worklog review page source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper re-scan candidate `project-source-assertions.ts` handled by [[Frontend Project Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `search-source-assertions.ts` handled by [[Frontend Search Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `review-public-user-assets-source-assertions.ts` handled by [[Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `dashboard-source-assertions.ts` handled by [[Frontend Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidates `worklog-card-list-source-assertions.ts` and `notifications-source-assertions.ts` handled by [[Frontend Worklog Card List Source Assertion Helper Split 2026-06-25]] and [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post project-detail/shell source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버에서 직접 작업 중이므로 `trading-bot` SSH를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `6caba53..dcdba7c`
- `agentfeed-cli` `464b10d..6fd0334`
- `agentfeed-dev` `033c7bf..e94ab05`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `8d37fb9` — `Split project detail source assertions`
- `agentfeed-frontend` `dcdba7c` — `Split shell source assertions`
- `agentfeed-cli` `e954f05` — `Document project detail source assertion split`
- `agentfeed-cli` `6fd0334` — `Document shell source assertion split`
- `agentfeed-dev` `cea066b` — `Log project detail source assertion split`
- `agentfeed-dev` `e94ab05` — `Log shell source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper re-scan candidate `api-boundary-worklog-source-assertions.ts` handled by [[Frontend API Boundary Worklog Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `worklog-review-page-source-assertions.ts` handled by [[Frontend Worklog Review Page Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `project-source-assertions.ts` handled by [[Frontend Project Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `search-source-assertions.ts` handled by [[Frontend Search Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `review-public-user-assets-source-assertions.ts` handled by [[Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `dashboard-source-assertions.ts` handled by [[Frontend Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidates `worklog-card-list-source-assertions.ts` and `notifications-source-assertions.ts` handled by [[Frontend Worklog Card List Source Assertion Helper Split 2026-06-25]] and [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post brand/profile source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버에서 직접 작업 중이므로 `trading-bot` SSH를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `fdfaeef..6caba53`
- `agentfeed-cli` `1a50754..4f00e3d`
- `agentfeed-dev` `08c6951..17765fe`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `55f5935` — `Split brand asset source assertions`
- `agentfeed-frontend` `6caba53` — `Split profile page source assertions`
- `agentfeed-cli` `1884c2f` — `Document brand asset source assertion split`
- `agentfeed-cli` `4f00e3d` — `Document profile page source assertion split`
- `agentfeed-dev` `85731b8` — `Log brand asset source assertion split`
- `agentfeed-dev` `17765fe` — `Log profile page source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [x] Next source assertion helper re-scan candidate `project-detail-source-assertions.ts` handled by [[Frontend Project Detail Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `shell-source-assertions.ts` handled by [[Frontend Shell Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `api-boundary-worklog-source-assertions.ts` handled by [[Frontend API Boundary Worklog Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `worklog-review-page-source-assertions.ts` handled by [[Frontend Worklog Review Page Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `project-source-assertions.ts` handled by [[Frontend Project Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `search-source-assertions.ts` handled by [[Frontend Search Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `review-public-user-assets-source-assertions.ts` handled by [[Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper re-scan candidate `dashboard-source-assertions.ts` handled by [[Frontend Dashboard Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidates `worklog-card-list-source-assertions.ts` and `notifications-source-assertions.ts` handled by [[Frontend Worklog Card List Source Assertion Helper Split 2026-06-25]] and [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `landing-preview-source-assertions.ts` handled by [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [x] Next source assertion helper candidate `settings-token-source-assertions.ts` handled by [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate is `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [x] Next commit counter started after this deploy docs commit.

## 2026-06-25 — Post CLI-authorize/API-boundary-enum source assertion splits threshold deploy

### Trigger

CLI-authorize and API-boundary-enum source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `d102021` — `Split CLI authorize source assertions`
- `agentfeed-frontend` `fdfaeef` — `Split API boundary enum source assertions`
- `agentfeed-cli` `fd81ca6` — `Document CLI authorize source assertion split`
- `agentfeed-cli` `aad02c7` — `Document API boundary enum source assertion split`
- `agentfeed-dev` `5b946ea` — `Log CLI authorize source assertion split`
- `agentfeed-dev` `d2ee665` — `Log API boundary enum source assertion split`

### Push ranges

- `agentfeed-frontend`: `f57aaec..fdfaeef`
- `agentfeed-cli`: `4dd9259..aad02c7`
- `agentfeed-dev`: `a025d3f..d2ee665`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` and Postgres volume/container.
- Recreated `backend` and `frontend`.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy after wait-ready.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` because this dev server uses HTTP IP URLs.
- Runtime CLI build passed: `npm ci && npm run build`, 0 vulnerabilities.

### Follow-up

- [x] 5-commit threshold push/deploy handled for CLI-authorize/API-boundary-enum source assertion splits.
- [ ] Next source assertion helper re-scan candidate is `brand-assets-source-assertions.ts` at 66 pure LOC.
- [ ] Next commit counter starts after this deploy docs commit.


## 2026-06-25 — Post feed-hook/project-detail-mutation source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버 `trading-bot`에서 직접 작업 중이므로 `ssh trading-bot`를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `d178a46..295d845`
- `agentfeed-cli` `f8e1997..43b3b57`
- `agentfeed-dev` `3ed4914..de980ca`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `3f3f4fc` — `Split feed hook accessibility source assertions`
- `agentfeed-frontend` `295d845` — `Split project detail mutation source assertions`
- `agentfeed-cli` `ffa7270` — `Document feed hook accessibility source assertion split`
- `agentfeed-cli` `43b3b57` — `Document project detail mutation source assertion split`
- `agentfeed-dev` `41fa588` — `Log feed hook accessibility source assertion split`
- `agentfeed-dev` `de980ca` — `Log project detail mutation source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [ ] Next source assertion helper candidates are `discovery-explore-source-assertions.ts` and `brand-svg-source-assertions.ts` at 30 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post discovery-explore/brand-SVG source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버 `trading-bot`에서 직접 작업 중이므로 `ssh trading-bot`를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `295d845..5ffab69`
- `agentfeed-cli` `d3d1a79..1d2b82b`
- `agentfeed-dev` `0894af3..e50dbdf`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `81ca746` — `Split discovery explore source assertions`
- `agentfeed-frontend` `5ffab69` — `Split brand SVG source assertions`
- `agentfeed-cli` `04decb0` — `Document discovery explore source assertion split`
- `agentfeed-cli` `1d2b82b` — `Document brand SVG source assertion split`
- `agentfeed-dev` `f502038` — `Log discovery explore source assertion split`
- `agentfeed-dev` `e50dbdf` — `Log brand SVG source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [ ] Next source assertion helper candidates are `worklog-detail-data-source-assertions.ts` and `api-boundary-public-user-source-assertions.ts` at 29 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post worklog-detail-data/API-boundary-public-user source assertion splits threshold deploy

### 작업 항목

- 5-commit threshold를 넘어 `agentfeed-frontend`, `agentfeed-cli`, `agentfeed-dev`를 push했다.
- 현재 서버 `trading-bot`에서 직접 작업 중이므로 `ssh trading-bot`를 사용하지 않고 `/home/ubuntu/dev/agentfeed` 작업 tree를 `/home/ubuntu/agentfeed` runtime tree로 로컬 rsync했다.
- `backend`와 `frontend` 컨테이너를 force-recreate했다. Postgres volume/container는 유지했다.
- Runtime CLI `/home/ubuntu/agentfeed/AgentFeed-CLI`에서 `npm ci && npm run build`를 실행했다.

### Push 범위

- `agentfeed-frontend` `5ffab69..54b0c2f`
- `agentfeed-cli` `cd2bea5..39f7f37`
- `agentfeed-dev` `7470aa0..ef33090`

### 검증 증거

- `docker compose --env-file .env ps` ✅ — backend/frontend/postgres healthy
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` ✅
- `GET http://127.0.0.1:18080/health/ready` ✅ — DB connected, migration head `027_browser_session_version`, up to date
- `GET http://127.0.0.1:18080/v1/metadata` ✅ — `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`
- `HEAD http://127.0.0.1:13030/` ✅ — `200 OK`
- `HEAD http://161.33.171.81:13030/` ✅ — `200 OK`
- `GET http://161.33.171.81:18080/health/ready` ✅ — DB connected, migration up to date
- Hosted compatibility smoke ✅ — `HOSTED_COMPATIBILITY_SMOKE_PASSED` with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server
- CLI runtime build ✅ — `npm ci && npm run build`, 0 vulnerabilities

### Commits

- `agentfeed-frontend` `5f901cd` — `Split worklog detail data source assertions`
- `agentfeed-frontend` `54b0c2f` — `Split API boundary public user source assertions`
- `agentfeed-cli` `0cbf04b` — `Document worklog detail data source assertion split`
- `agentfeed-cli` `39f7f37` — `Document API boundary public user source assertion split`
- `agentfeed-dev` `2a3da4f` — `Log worklog detail data source assertion split`
- `agentfeed-dev` `ef33090` — `Log API boundary public user source assertion split`

### 후행 TODO

- [x] 5-commit threshold push/deploy 처리 완료.
- [ ] Next source assertion helper candidates are `feed-filter-source-assertions.ts`, `brand-agent-glyph-source-assertions.ts`, `auth-shell-session-source-assertions.ts` at 26 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post feed-filter/brand-agent-glyph source assertion splits threshold deploy

### Trigger

Feed-filter and brand-agent-glyph source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `9808616` — `Split feed filter source assertions`
- `agentfeed-frontend` `9cbcd89` — `Split brand agent glyph source assertions`
- `agentfeed-cli` `22e8e07` — `Document feed filter source assertion split`
- `agentfeed-cli` `452c48f` — `Document brand agent glyph source assertion split`
- `agentfeed-dev` `a2c531d` — `Log feed filter source assertion split`
- `agentfeed-dev` `328f299` — `Log brand agent glyph source assertion split`

### Push ranges

- `agentfeed-frontend`: `54b0c2f..9cbcd89`
- `agentfeed-cli`: `5ca4a3a..452c48f`
- `agentfeed-dev`: `e0ee91f..328f299`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `auth-shell-session-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `worklog-review-action-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `profile-page-a11y-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates: `cli-authorize-route-source-assertions.ts`, `api-boundary-rank-notification-source-assertions.ts` at 25 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post auth-shell-session/worklog-review-action source assertion splits threshold deploy

### Trigger

Auth-shell-session and worklog-review-action source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `64a8c35` — `Split auth shell session source assertions`
- `agentfeed-frontend` `200bba8` — `Split worklog review action source assertions`
- `agentfeed-cli` `90105b6` — `Document auth shell session source assertion split`
- `agentfeed-cli` `63d47d7` — `Document worklog review action source assertion split`
- `agentfeed-dev` `faafe03` — `Log auth shell session source assertion split`
- `agentfeed-dev` `22323bf` — `Log worklog review action source assertion split`

### Push ranges

- `agentfeed-frontend`: `9cbcd89..200bba8`
- `agentfeed-cli`: `006f63b..63d47d7`
- `agentfeed-dev`: `e01ff87..22323bf`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `profile-page-a11y-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates: `cli-authorize-route-source-assertions.ts`, `api-boundary-rank-notification-source-assertions.ts` at 25 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post profile-page/CLI-authorize source assertion splits threshold deploy

### Trigger

Profile-page accessibility and CLI-authorize route source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `04fd49d` — `Split profile page accessibility source assertions`
- `agentfeed-frontend` `bfba5f0` — `Split CLI authorize route source assertions`
- `agentfeed-cli` `6f2d810` — `Document profile page accessibility source assertion split`
- `agentfeed-cli` `5c3b964` — `Document CLI authorize route source assertion split`
- `agentfeed-dev` `4606762` — `Log profile page accessibility source assertion split`
- `agentfeed-dev` `09752b2` — `Log CLI authorize route source assertion split`

### Push ranges

- `agentfeed-frontend`: `200bba8..bfba5f0`
- `agentfeed-cli`: `884c2fc..5c3b964`
- `agentfeed-dev`: `bfcc92e..09752b2`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `api-boundary-rank-notification-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `project-visibility-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `cli-authorize-session-storage-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `worklog-detail-mutation-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `worklog-card-navigation-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `feed-follow-action-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates: `auth-shell-social-source-assertions.ts`, `auth-shell-a11y-source-assertions.ts` at 21 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post API-boundary/project-visibility source assertion splits threshold deploy

### Trigger

API-boundary rank/notification and project-visibility source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `b81fb81` — `Split API boundary rank notification assertions`
- `agentfeed-frontend` `abeaa5b` — `Split project visibility source assertions`
- `agentfeed-cli` `ed45915` — `Document API boundary rank notification source assertion split`
- `agentfeed-cli` `e123b37` — `Document project visibility source assertion split`
- `agentfeed-dev` `c64d17a` — `Log API boundary rank notification source assertion split`
- `agentfeed-dev` `b5e8dee` — `Log project visibility source assertion split`

### Push ranges

- `agentfeed-frontend`: `bfba5f0..abeaa5b`
- `agentfeed-cli`: `fae898a..e123b37`
- `agentfeed-dev`: `e7a2685..b5e8dee`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidate: `cli-authorize-session-storage-source-assertions.ts` at 22 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post CLI-authorize/worklog-detail-mutation source assertion splits threshold deploy

### Trigger

CLI-authorize session-storage and worklog-detail-mutation source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `eed2809` — `Split CLI authorize session storage assertions`
- `agentfeed-frontend` `590f3da` — `Split worklog detail mutation source assertions`
- `agentfeed-cli` `e1bde6c` — `Document CLI authorize session storage source assertion split`
- `agentfeed-cli` `c1aafc2` — `Document worklog detail mutation source assertion split`
- `agentfeed-dev` `40a2e3e` — `Log CLI authorize session storage source assertion split`
- `agentfeed-dev` `8d48774` — `Log worklog detail mutation source assertion split`

### Push ranges

- `agentfeed-frontend`: `abeaa5b..590f3da`
- `agentfeed-cli`: `1b7c864..c1aafc2`
- `agentfeed-dev`: `5e744bc..8d48774`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidates: `worklog-card-navigation-source-assertions.ts`, `feed-follow-action-source-assertions.ts`, `auth-shell-social-source-assertions.ts`, `auth-shell-a11y-source-assertions.ts` at 21 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post auth-shell social/accessibility source assertion splits threshold deploy

### Trigger

Auth-shell social and accessibility source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `42e5484` — `Split auth shell social source assertions`
- `agentfeed-frontend` `987a419` — `Split auth shell accessibility source assertions`
- `agentfeed-cli` `1f2eb13` — `Document auth shell social source assertion split`
- `agentfeed-cli` `e71eb3b` — `Document auth shell accessibility source assertion split`
- `agentfeed-dev` `bba56c7` — `Log auth shell social source assertion split`
- `agentfeed-dev` `d542b4a` — `Log auth shell accessibility source assertion split`

### Push ranges

- `agentfeed-frontend`: `27aa56f..987a419`
- `agentfeed-cli`: `096d553..e71eb3b`
- `agentfeed-dev`: `bfae2c1..d542b4a`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `shell-ci-source-assertions.ts` handled by [[Frontend Shell CI Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidates: `settings-auth-recovery-source-assertions.ts`, `feed-sidebar-source-assertions.ts`, `cli-authorize-retry-source-assertions.ts`, `api-boundary-worklog-status-action-source-assertions.ts`, `api-boundary-project-source-assertions.ts` at 20 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post shell-CI/settings-auth-recovery source assertion splits threshold deploy

### Trigger

Shell CI and settings auth recovery source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `e647bba` — `Split shell CI source assertions`
- `agentfeed-frontend` `3a0055c` — `Split settings auth recovery source assertions`
- `agentfeed-cli` `e01afda` — `Document shell CI source assertion split`
- `agentfeed-cli` `4b3ca14` — `Document settings auth recovery source assertion split`
- `agentfeed-dev` `03cd475` — `Log shell CI source assertion split`
- `agentfeed-dev` `108828f` — `Log settings auth recovery source assertion split`

### Push ranges

- `agentfeed-frontend`: `987a419..3a0055c`
- `agentfeed-cli`: `d7bd224..4b3ca14`
- `agentfeed-dev`: `12b629f..108828f`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `feed-sidebar-source-assertions.ts` handled by [[Frontend Feed Sidebar Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidates: `cli-authorize-retry-source-assertions.ts`, `api-boundary-worklog-status-action-source-assertions.ts`, `api-boundary-project-source-assertions.ts` at 20 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post feed-sidebar/CLI-authorize-retry source assertion splits threshold deploy

### Trigger

Feed sidebar and CLI authorize retry source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `2078473` — `Split feed sidebar source assertions`
- `agentfeed-frontend` `c1c2c0c` — `Split CLI authorize retry source assertions`
- `agentfeed-cli` `8def8b4` — `Document feed sidebar source assertion split`
- `agentfeed-cli` `dde6d97` — `Document CLI authorize retry source assertion split`
- `agentfeed-dev` `5fb0a8e` — `Log feed sidebar source assertion split`
- `agentfeed-dev` `ecc4254` — `Log CLI authorize retry source assertion split`

### Push ranges

- `agentfeed-frontend`: `3a0055c..c1c2c0c`
- `agentfeed-cli`: `8871a9a..dde6d97`
- `agentfeed-dev`: `9d78459..ecc4254`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `api-boundary-worklog-status-action-source-assertions.ts` handled by [[Frontend API Boundary Worklog Status Action Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidate: `api-boundary-project-source-assertions.ts` at 20 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post API-boundary worklog-status/project source assertion splits threshold deploy

### Trigger

API-boundary worklog status/action and project source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `e475407` — `Split API boundary worklog status action assertions`
- `agentfeed-frontend` `c9e9f4d` — `Split API boundary project source assertions`
- `agentfeed-cli` `033eeac` — `Document API boundary worklog status action split`
- `agentfeed-cli` `e8706bf` — `Document API boundary project source assertion split`
- `agentfeed-dev` `b0ed6ae` — `Log API boundary worklog status action split`
- `agentfeed-dev` `1cf0dac` — `Log API boundary project source assertion split`

### Push ranges

- `agentfeed-frontend`: `c1c2c0c..c9e9f4d`
- `agentfeed-cli`: `1b64333..e8706bf`
- `agentfeed-dev`: `596d66d..1cf0dac`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `worklog-card-author-source-assertions.ts` handled by [[Frontend Worklog Card Author Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidates: `settings-preferences-source-assertions.ts`, `project-visibility-source-assertions.ts`, `cli-authorize-terminal-a11y-source-assertions.ts`, `adapters-source-assertions.ts` at 19 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post worklog-card-author/settings-preferences source assertion splits threshold deploy

### Trigger

Worklog card author and settings preferences source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `4f7e98b` — `Split worklog card author source assertions`
- `agentfeed-frontend` `f4d99d1` — `Split settings preferences source assertions`
- `agentfeed-cli` `5d7bc60` — `Document worklog card author source assertion split`
- `agentfeed-cli` `96f6f9a` — `Document settings preferences source assertion split`
- `agentfeed-dev` `5bac70c` — `Log worklog card author source assertion split`
- `agentfeed-dev` `d8a54df` — `Log settings preferences source assertion split`

### Push ranges

- `agentfeed-frontend`: `c9e9f4d..f4d99d1`
- `agentfeed-cli`: `6e53775..96f6f9a`
- `agentfeed-dev`: `7372add..d8a54df`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `project-visibility-source-assertions.ts` handled by [[Frontend Project Visibility Source Assertion Runner Split 2026-06-25]].
- [ ] Next source assertion helper candidates: `cli-authorize-terminal-a11y-source-assertions.ts`, `adapters-source-assertions.ts` at 19 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post project-visibility/CLI-authorize-terminal source assertion splits threshold deploy

### Trigger

Project visibility and CLI authorize terminal accessibility source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `0fedd29` — `Split project visibility source assertions`
- `agentfeed-frontend` `747064b` — `Split CLI authorize terminal accessibility assertions`
- `agentfeed-cli` `044f8b0` — `Document project visibility source assertion split`
- `agentfeed-cli` `09f9baa` — `Document CLI authorize terminal accessibility split`
- `agentfeed-dev` `4ab06e6` — `Log project visibility source assertion split`
- `agentfeed-dev` `8017812` — `Log CLI authorize terminal accessibility split`

### Push ranges

- `agentfeed-frontend`: `f4d99d1..747064b`
- `agentfeed-cli`: `c672234..09f9baa`
- `agentfeed-dev`: `b95bef6..8017812`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [x] Next source assertion helper candidate `adapters-source-assertions.ts` handled by [[Frontend Adapter Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidates: `review-public-asset-metadata-source-assertions.ts`, `profile-page-data-source-assertions.ts`, `leaderboard-source-assertions.ts` at 18 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post adapter/review-public-asset source assertion splits threshold deploy

### Trigger

Adapter and review public asset metadata source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `92df748` — `Split adapter source assertions`
- `agentfeed-frontend` `286f204` — `Split review public asset metadata assertions`
- `agentfeed-cli` `e95b93c` — `Document adapter source assertion split`
- `agentfeed-cli` `d660d01` — `Document review public asset metadata split`
- `agentfeed-dev` `1224a02` — `Log adapter source assertion split`
- `agentfeed-dev` `1c93407` — `Log review public asset metadata split`

### Push ranges

- `agentfeed-frontend`: `747064b..286f204`
- `agentfeed-cli`: `c9bb8af..d660d01`
- `agentfeed-dev`: `5221a43..1c93407`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidates: `profile-page-data-source-assertions.ts`, `leaderboard-source-assertions.ts` at 18 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post profile-page/leaderboard source assertion splits threshold deploy

### Trigger

Profile page data and leaderboard source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `56ce76a` — `Split profile page data source assertions`
- `agentfeed-frontend` `5055315` — `Split leaderboard source assertions`
- `agentfeed-cli` `f81927b` — `Document profile page data source assertion split`
- `agentfeed-cli` `301e811` — `Document leaderboard source assertion split`
- `agentfeed-dev` `7749a07` — `Log profile page data source assertion split`
- `agentfeed-dev` `aec62bb` — `Log leaderboard source assertion split`

### Push ranges

- `agentfeed-frontend`: `286f204..5055315`
- `agentfeed-cli`: `dfe3269..301e811`
- `agentfeed-dev`: `402cdbe..aec62bb`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidates: `worklog-detail-profile-source-assertions.ts`, `settings-token-error-source-assertions.ts`, `project-create-source-assertions.ts` at 17 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post worklog-detail/settings-token source assertion splits threshold deploy

### Trigger

Worklog detail profile and settings token error source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `db9940c` — `Split worklog detail profile source assertions`
- `agentfeed-frontend` `9850192` — `Split settings token error source assertions`
- `agentfeed-cli` `26b7a08` — `Document worklog detail profile source assertion split`
- `agentfeed-cli` `ce5871d` — `Document settings token error source assertion split`
- `agentfeed-dev` `2c61de5` — `Log worklog detail profile source assertion split`
- `agentfeed-dev` `3801cee` — `Log settings token error source assertion split`

### Push ranges

- `agentfeed-frontend`: `5055315..9850192`
- `agentfeed-cli`: `70cf01a..ce5871d`
- `agentfeed-dev`: `b5ebdf6..3801cee`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidates: `project-create-source-assertions.ts`, `profile-page-project-source-assertions.ts`, `profile-page-follow-source-assertions.ts` at 17 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post project-create/profile-page-project source assertion splits threshold deploy

### Trigger

Project create and profile page project source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `4e15337` — `Split project create source assertions`
- `agentfeed-frontend` `7f2605f` — `Split profile page project source assertions`
- `agentfeed-cli` `28318e1` — `Document project create source assertion split`
- `agentfeed-cli` `1dcef4b` — `Document profile page project source assertion split`
- `agentfeed-dev` `72cbd66` — `Log project create source assertion split`
- `agentfeed-dev` `6dff78d` — `Log profile page project source assertion split`

### Push ranges

- `agentfeed-frontend`: `9850192..7f2605f`
- `agentfeed-cli`: `8448468..1dcef4b`
- `agentfeed-dev`: `84e93b7..6dff78d`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidates: `profile-page-follow-source-assertions.ts`, `auth-shell-review-recovery-source-assertions.ts`, `auth-shell-identity-source-assertions.ts`, `api-boundary-privacy-source-assertions.ts` at 17 pure LOC.
- [x] Next commit counter started after this deploy docs commit.


## 2026-06-25 — Post profile-follow/auth-review-recovery source assertion splits threshold deploy

### Trigger

Profile page follow and auth shell review recovery source assertion helper split docs brought the post-deploy unpushed counter to 6 commits. Pushed and deployed from current server local shell. No SSH to `trading-bot` because Codex is already running on `trading-bot`.

### Pushed commits

- `agentfeed-frontend` `4c5b93f` — `Split profile page follow source assertions`
- `agentfeed-frontend` `cd300d8` — `Split auth shell review recovery assertions`
- `agentfeed-cli` `1c81b77` — `Document profile page follow source assertion split`
- `agentfeed-cli` `bd9909a` — `Document auth shell review recovery split`
- `agentfeed-dev` `4047029` — `Log profile page follow source assertion split`
- `agentfeed-dev` `5507866` — `Log auth shell review recovery split`

### Push ranges

- `agentfeed-frontend`: `7f2605f..cd300d8`
- `agentfeed-cli`: `aba5cd6..bd9909a`
- `agentfeed-dev`: `ef89651..5507866`

### Deploy path

- Working tree: `/home/ubuntu/dev/agentfeed`
- Runtime tree: `/home/ubuntu/agentfeed`
- Compose dir: `/home/ubuntu/agentfeed/agentfeed-dev`
- Synced repos: `agentfeed-dev`, `agentfeed-backend`, `agentfeed-frontend`, `agentfeed-cli` → `AgentFeed-CLI`
- Preserved runtime `.env` files and Postgres volume/container.
- Recreated `backend` and `frontend` with Docker Compose.
- Rebuilt runtime CLI with `npm ci && npm run build`.

### Verification

- `docker compose --env-file .env ps` → backend/frontend/postgres healthy.
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env scripts/wait-ready.sh` → passed.
- Runtime CLI `npm ci && npm run build` → passed, 0 vulnerabilities.
- `GET http://127.0.0.1:18080/health/ready` → ready, DB connected, migration head `027_browser_session_version`, up to date.
- `GET http://127.0.0.1:18080/v1/metadata` → `v1 / 2026-06-03`, review base `http://161.33.171.81:13030`.
- `HEAD http://127.0.0.1:13030/` → `200 OK`.
- `HEAD http://161.33.171.81:13030/` → `200 OK`.
- `GET http://161.33.171.81:18080/health/ready` → ready, DB connected, migration up to date.
- Hosted compatibility smoke passed with `AGENTFEED_ALLOW_INSECURE_API=1` for HTTP IP dev server.
- Hosted CLI doctor reached API and confirmed compatibility; temp cwd account/project/git warnings were expected.
- Frontend API diagnostic passed: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`.

### Follow-up

- [x] 5-commit threshold push/deploy handled.
- [ ] Next source assertion helper candidates: `auth-shell-identity-source-assertions.ts`, `api-boundary-privacy-source-assertions.ts` at 17 pure LOC.
- [x] Next commit counter started after this deploy docs commit.
