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
- [ ] Next source assertion helper re-scan candidate is `api-boundary-worklog-source-assertions.ts` at 51 pure LOC.
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
- [ ] Next source assertion helper re-scan candidate is `api-boundary-worklog-source-assertions.ts` at 51 pure LOC.
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
- [ ] Next source assertion helper re-scan candidate is `api-boundary-worklog-source-assertions.ts` at 51 pure LOC.
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
