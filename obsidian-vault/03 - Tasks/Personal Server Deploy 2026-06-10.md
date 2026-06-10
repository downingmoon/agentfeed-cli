---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - deployment
  - personal-server
  - smoke-test
status: done
---

# Personal Server Deploy 2026-06-10

> [!success] Result
> User override 요청에 따라 개인서버 `161.33.171.81`에 현재 CLI/Frontend/Backend/Dev 소스를 동기화하고 Docker Compose 서비스를 recreate 했다.

## Target

- Frontend: `http://161.33.171.81:13030`
- Backend API: `http://161.33.171.81:18080/v1`
- Postgres host port: `127.0.0.1:15432`
- Remote root: `~/agentfeed`
- SSH host alias: `trading-bot`

## Source SHAs

- CLI/docs: `87a0c76` — Document user stats activity contract split
- Frontend: `46828e1` — Reject malformed frontend error envelopes
- Backend: `1bd2e92` — Split user stats activity contracts
- Dev orchestration: `622293e` — Gate strict client error response schemas

## Deployment Command

```text
./scripts/server-deploy.sh --execute --up
```

## Server Container Evidence

```text
agentfeed-server-backend-1    Up (healthy)   0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up (healthy)   0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up (healthy)   127.0.0.1:15432->5432/tcp
```

## HTTP Evidence

```text
GET http://161.33.171.81:18080/v1/metadata
# service=agentfeed-api
# api_version=v1
# backend_version=0.1.0
# contract_version=2026-06-03
# review_base_url=http://161.33.171.81:13030
```

```text
HEAD http://161.33.171.81:13030/
# HTTP/1.1 200 OK
```

## Hosted Compatibility Smoke

```text
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_ALLOW_INSECURE_API=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
bash scripts/smoke-hosted-compatibility.sh
```

Result:

```text
FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED
BACKEND_METADATA_COMPATIBILITY_PASSED v1 2026-06-03
BACKEND_READINESS_COMPATIBILITY_PASSED
FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03
HOSTED_COMPATIBILITY_SMOKE_PASSED
```

## Notes

> [!warning]
> 이 배포는 IP-only server-test 환경이다. HTTPS/DNS/production OAuth hardening은 별도 production 인프라 단계에서 진행해야 한다.

> [!info]
> CLI doctor의 `Account: token missing`은 임시 홈 디렉터리에서 실행한 smoke 특성상 정상적인 attention 항목이다. API reachable/compatible 항목은 통과했다.

## Follow-up

- [ ] Production 전 HTTPS 도메인과 OAuth callback을 production URL로 재설정한다.
- [ ] 운영 배포 방식은 개인서버 수동 deploy와 CI/CD 중 하나로 명확히 결정한다.
- [ ] 서버 데이터 초기화가 필요한 테스트는 별도 reset 절차로만 수행한다.
