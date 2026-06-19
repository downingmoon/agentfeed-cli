---
title: Personal Server Deploy One-off Refresh 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - evidence
status: done
aliases:
  - 2026-06-19 개인서버 1회 배포
  - 2026-06-19 Personal Server Deploy One-off Refresh
---

# Personal Server Deploy One-off Refresh 2026-06-19

> [!success]
> 사용자의 이번 턴 한정 명시 요청으로 현재 서버 `/home/ubuntu/agentfeed`에 AgentFeed 최신 작업분을 동기화하고 app 컨테이너를 재생성했다. 기존 enterprise-readiness goal의 기본 정책인 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지”는 다음 작업부터 그대로 유지한다.

## Scope

- 요청: 이번 턴 한정 개인서버 배포 1회 수행
- 실행 위치: `/home/ubuntu/dev/agentfeed`
- 배포 대상: `/home/ubuntu/agentfeed`
- Compose project: `agentfeed-server`
- 서버 테스트 URL:
  - Frontend: `http://161.33.171.81:13030`
  - API readiness: `http://161.33.171.81:18080/health/ready`
- 배포 시점 소스:
  - `agentfeed-frontend` `main` @ `8bb046d`
  - `agentfeed-cli` `main` @ `c04b8e9`
  - `agentfeed-dev` `main` @ `c090d3b`
  - `agentfeed-backend` `master` @ `63c918d`

## Actions

1. `/home/ubuntu/dev/agentfeed`의 4개 repo를 `/home/ubuntu/agentfeed`로 `rsync --delete` 동기화했다.
2. 기존 server `.env`는 유지했다.
3. `docker compose --env-file .env config`로 compose config를 검증했다.
4. `postgres`는 기존 컨테이너/볼륨을 유지했다.
5. `backend`와 `frontend`만 `docker compose --env-file .env up -d --force-recreate backend frontend`로 재생성했다.

## Verification Evidence

```text
agentfeed-server-backend-1    Up / healthy    0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up / healthy    0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up / healthy    127.0.0.1:15432->5432/tcp
```

Readiness:

```json
{"database":{"connected":true,"error":null,"revision":"027_browser_session_version"},"migration":{"error":null,"head":"027_browser_session_version","up_to_date":true},"status":"ready"}
```

HTTP checks:

- `GET http://127.0.0.1:13030/` → `200`, `41923` bytes
- `GET http://localhost:13030/` → `200`, `41923` bytes
- `GET http://161.33.171.81:13030/` → `200`, `41923` bytes
- `GET http://127.0.0.1:18080/health/ready` → `200`, `184` bytes
- `GET http://localhost:18080/health/ready` → `200`, `184` bytes
- `GET http://161.33.171.81:18080/health/ready` → `200`, `184` bytes
- `ENV_FILE=/home/ubuntu/agentfeed/agentfeed-dev/.env /home/ubuntu/agentfeed/agentfeed-dev/scripts/wait-ready.sh` → passed

Frontend build/start evidence from container logs:

```text
✓ Compiled successfully in 19.1s
✓ Generating static pages (18/18)
✓ Ready in 1683ms
```

## Follow-up

> [!note]
> 이번 배포는 사용자 명시 요청에 따른 1회 예외다. 다음 enterprise-readiness 작업부터는 기존 “서버/인프라/CI/CD 보류” 및 “서버 배포 금지” 제약을 재적용한다.

> [!todo]
> 실제 GitHub OAuth 승인, CLI `login -> collect -> publish -> review` 원격 전체 플로우는 계정/세션 의도가 필요한 수동 smoke로 별도 확인한다.
