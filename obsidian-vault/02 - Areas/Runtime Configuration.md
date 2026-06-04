---
title: Runtime Configuration
status: active
tags:
  - agentfeed/config
  - agentfeed/runtime
  - agentfeed/integration
updated: 2026-06-04
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

관련: [[Active Tasks]], [[Integration - CLI Backend Frontend]]
