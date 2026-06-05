---
title: Server IP-only Smoke Evidence 2026-06-05
aliases:
  - 개인 서버 IP-only smoke evidence
date: 2026-06-05
status: verified
tags:
  - agentfeed/evidence
  - agentfeed/server-test
  - project/verification
---

# Server IP-only Smoke Evidence 2026-06-05

관련 문서: [[Active Tasks]], [[Runtime Configuration]], [[Human Action Checklist]]

> [!success] 결론
> 개인 서버 `trading-bot`에서 AgentFeed Backend/Frontend/Postgres compose stack이 정상 기동했고, 로컬 CLI도 서버 Backend를 바라보도록 연결 확인됐다.

## Endpoint

| Surface | URL | Evidence |
| --- | --- | --- |
| Frontend | `http://161.33.171.81:13030` | `/`, `/feed`, `/cli/authorize` HTTP 200 |
| Backend | `http://161.33.171.81:18080` | `/health/ready` ready, migration head `027_browser_session_version` |
| CLI API base | `http://161.33.171.81:18080/v1` | `AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_API_BASE_URL=... agentfeed status` 통과 |
| Postgres | `127.0.0.1:15432` on server | 외부 공개 없음 |

## Compose 상태

```text
agentfeed-server-backend-1    Up (healthy)  0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up (healthy)  0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up (healthy)  127.0.0.1:15432->5432/tcp
```

## Frontend server-test runtime

원격 frontend는 이제 `next dev`가 아니라 production-style runtime으로 실행된다.

```text
FRONTEND_RUNTIME=production
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1
```

> [!note]
> `NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1`은 secret이 아니다. IP-only HTTP 테스트에서 브라우저 번들도 server build와 같은 임시 허용 판단을 하도록 맞추는 공개 runtime flag다.

## Browser evidence

- Playwright opened `http://161.33.171.81:13030/feed`.
- Page title: `Public Feed — AgentFeed`.
- Console: `0 errors, 0 warnings`.
- API config banner absent.
- CSP `connect-src` includes `http://161.33.171.81:18080`.

## OAuth route evidence

GitHub OAuth start route는 실제 GitHub authorization URL로 redirect를 생성한다.

```text
GET /v1/auth/github?next=/cli/authorize -> 307 Temporary Redirect
redirect_uri=http://161.33.171.81:18080/v1/auth/github/callback
```

CLI browser auth session도 생성되고 authorize page가 HTML 200을 반환했다.

```text
POST /v1/auth/cli/sessions -> created=true
/cli/authorize?... -> HTTP 200 text/html
```

## 남은 사람 작업

- GitHub OAuth App에 현재 IP-only callback이 정확히 들어갔는지 한 번 더 확인.
- 브라우저에서 실제 GitHub 로그인 승인 후 `agentfeed login` live flow를 수행.
- 서버 방화벽/security group에서 `13030`, `18080`만 필요한 범위로 허용.
- Postgres volume backup 위치/주기를 결정.

> [!warning] Production readiness 아님
> 이 evidence는 IP-only server smoke다. HTTPS domain, reverse proxy, production secret/host policy, DNS가 준비된 production readiness 증거는 아니다.
