---
title: Runtime Configuration
status: active
tags:
  - agentfeed/config
  - agentfeed/runtime
  - agentfeed/integration
updated: 2026-06-25
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

현재 서버 기준 배포 사실:

> [!important]
> 현재 Codex 실행 환경은 배포 서버 자체다. `trading-bot` SSH alias로 다시 접속하지 않는다. 배포는 `/home/ubuntu/dev/agentfeed` 작업본을 `/home/ubuntu/agentfeed` 실행 tree로 로컬 `rsync`한 뒤 `/home/ubuntu/agentfeed/agentfeed-dev`에서 compose를 재생성한다.

현재 실행 tree:

```text
/home/ubuntu/agentfeed/agentfeed-dev
/home/ubuntu/agentfeed/agentfeed-backend
/home/ubuntu/agentfeed/agentfeed-frontend
/home/ubuntu/agentfeed/AgentFeed-CLI
```

현재 작업 tree:

```text
/home/ubuntu/dev/agentfeed/agentfeed-dev
/home/ubuntu/dev/agentfeed/agentfeed-backend
/home/ubuntu/dev/agentfeed/agentfeed-frontend
/home/ubuntu/dev/agentfeed/agentfeed-cli
```

서버 내부에서 1회 배포할 때:

```bash
rsync -az --delete --exclude .git/ --exclude node_modules/ --exclude .next/ --exclude .venv/ --exclude __pycache__/ --exclude .pytest_cache/ --exclude .mypy_cache/ --exclude .ruff_cache/ --exclude dist/ --exclude .env --exclude '.env.*' /home/ubuntu/dev/agentfeed/agentfeed-dev/ /home/ubuntu/agentfeed/agentfeed-dev/
rsync -az --delete --exclude .git/ --exclude node_modules/ --exclude .next/ --exclude .venv/ --exclude __pycache__/ --exclude .pytest_cache/ --exclude .mypy_cache/ --exclude .ruff_cache/ --exclude dist/ --exclude .env --exclude '.env.*' /home/ubuntu/dev/agentfeed/agentfeed-backend/ /home/ubuntu/agentfeed/agentfeed-backend/
rsync -az --delete --exclude .git/ --exclude node_modules/ --exclude .next/ --exclude .venv/ --exclude __pycache__/ --exclude .pytest_cache/ --exclude .mypy_cache/ --exclude .ruff_cache/ --exclude dist/ --exclude .env --exclude '.env.*' /home/ubuntu/dev/agentfeed/agentfeed-frontend/ /home/ubuntu/agentfeed/agentfeed-frontend/
rsync -az --delete --exclude .git/ --exclude node_modules/ --exclude .next/ --exclude .venv/ --exclude __pycache__/ --exclude .pytest_cache/ --exclude .mypy_cache/ --exclude .ruff_cache/ --exclude dist/ --exclude .env --exclude '.env.*' /home/ubuntu/dev/agentfeed/agentfeed-cli/ /home/ubuntu/agentfeed/AgentFeed-CLI/
cd /home/ubuntu/agentfeed/agentfeed-dev
docker compose --env-file .env config >/dev/null
docker compose --env-file .env up -d postgres
docker compose --env-file .env up -d --force-recreate backend frontend
docker compose --env-file .env ps
```

`trading-bot`은 서버 밖 다른 PC에서 접근할 때의 과거 SSH alias로만 취급한다. 이 서버 내부에서는 사용하지 않는다.

로컬 CLI와 브라우저에서 IP endpoint smoke를 실행한다.

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
