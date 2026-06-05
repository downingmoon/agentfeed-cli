---
title: Runtime Configuration
status: active
tags:
  - agentfeed/config
  - agentfeed/runtime
  - agentfeed/integration
updated: 2026-06-05
---

# Runtime Configuration

## Local defaults

`agentfeed-dev/.env.example` 기준:

```bash
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
AGENTFEED_API_BASE_URL=http://localhost:8000/v1
GITHUB_REDIRECT_URI=http://localhost:8000/v1/auth/github/callback
```

Port conflict 시 `.env`에서 `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`와 URL들을 함께 맞춘다.

## Personal server IP-only test

owner의 현재 방향은 DNS 없이 개인 서버 IP로 Frontend/Backend를 테스트 구동하는 것이다.

> [!important]
> 이 모드는 hosted/server smoke다. production/commercial readiness는 HTTPS public domain, production secret, proxy/origin allowlist, OAuth live evidence가 준비된 뒤 별도로 실행한다.

예시 `.env` 형태:

```bash
FRONTEND_URL=http://161.33.171.81:13030
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1
GITHUB_REDIRECT_URI=http://161.33.171.81:18080/v1/auth/github/callback
```

CLI를 로컬 PC에서 서버 Backend에 붙일 때:

```bash
AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 agentfeed status
AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 agentfeed login
```

권장 순서:

1. `agentfeed-dev`에서 서버 preflight 실행.

```bash
make server-preflight
make server-oauth
make server-deploy-dry-run
```

2. `make server-oauth`에서 GitHub OAuth Client ID/Secret을 숨김 입력으로 `.env.server`에 반영한다. secret은 출력하지 않는다.
3. preflight가 생성한 `.env.server`를 확인한다. 현재 서버 scan 기준 충돌 회피 포트는 Frontend `13030`, Backend `18080`, Postgres host port `15432`다. server-test frontend는 `FRONTEND_RUNTIME=production`, `NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1`을 사용한다.
4. 실제 sync만 할 때는 `make server-deploy`를 사용한다. 이 단계는 컨테이너를 시작하지 않는다.
5. 실제 remote compose 시작은 별도 승인 후 `make server-up`으로 실행한다.
6. 서버에 Docker/Compose, Node, git 등 기본 runtime이 없다면 먼저 설치한다.
7. 서버 remote layout은 `~/agentfeed/{agentfeed-dev,agentfeed-backend,agentfeed-frontend,AgentFeed-CLI}`다.
8. 로컬 CLI와 브라우저에서 IP endpoint smoke를 실행한다.

> [!warning]
> Backend/Frontend production rule은 HTTP/private/local host를 fail-closed할 수 있다. IP-only 단계에서는 production build/deploy 판정이 아니라 dev/server smoke 판정으로 기록한다. Backend는 이 용도로만 `ENVIRONMENT=server-test`를 지원한다.

## Dev orchestration

```bash
make setup
make dev
make up
make wait
make down
make logs
make test
make smoke-e2e
```

- `make dev`: postgres/backend/frontend foreground compose.
- `make up`: detached + readiness wait.
- `make wait`: running stack readiness JSON 확인.
- `make dev-native`: DB compose + backend/frontend native boot.

## API base parity

Frontend와 CLI는 같은 Backend root를 가리켜야 한다.

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
AGENTFEED_API_BASE_URL=http://localhost:8000/v1
```

`agentfeed-dev`의 parity gate가 split-brain 설정을 fail-closed 한다.

IP-only 서버에서는 같은 규칙을 서버 IP로 치환한다.

```bash
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1
```

## Hosted readiness

실제 domain이 아직 없으므로 기본 hosted domain은 없다.

```bash
AGENTFEED_HOSTED_FRONTEND_URL=https://app.example.com \
AGENTFEED_HOSTED_API_BASE_URL=https://api.example.com/v1 \
make smoke-hosted-compatibility
```

Frontend manual workflow도 `api_url`, `frontend_url` 입력이 필수다.

## Production rules

- Backend production/staging은 placeholder secret, local DB URL, memory rate-limit store, private/intranet host, missing proxy/origin config를 fail-fast 한다.
- Frontend production build는 `NEXT_PUBLIC_API_URL`이 필수이며 localhost/private HTTP host를 차단한다.
- Hosted URL은 HTTPS public origin이어야 하며 credentials/query/hash/path를 포함하지 않는다.
- IP-only HTTP 서버 테스트는 production rules 통과 증거가 아니다.

관련: [[Active Tasks]], [[Human Action Checklist]], [[Integration - CLI Backend Frontend]]
