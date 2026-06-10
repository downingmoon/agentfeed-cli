---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - verification
aliases:
  - 2026-06-10 personal server deploy
---

# Personal Server Deploy 2026-06-10

> [!success]
> 사용자의 명시 요청으로 개인서버 `161.33.171.81`에 AgentFeed CLI/Frontend/Backend/Dev orchestration 최신 작업분을 동기화하고 app 컨테이너를 재생성했다.

## Deployed Sources

- CLI/docs: `c1ae764 Document production settings contract split`
- Frontend: `46828e1 Reject malformed frontend error envelopes`
- Backend: `0d1a717 Split production settings contracts`
- Dev orchestration: `622293e Gate strict client error response schemas`

## Command

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
./scripts/server-deploy.sh --execute --up
```

## Result

Remote `docker compose ps` after deploy:

```text
agentfeed-server-backend-1    Up / healthy    0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up / healthy    0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up / healthy    127.0.0.1:15432->5432/tcp
```

## Verification Evidence

```text
GET http://161.33.171.81:18080/health
# 200 {"status":"ok"}

GET http://161.33.171.81:18080/health/ready
# 200 database connected, migration head 027_browser_session_version, up_to_date true

GET http://161.33.171.81:18080/v1/metadata
# 200 api_version v1, contract_version 2026-06-03, review_base_url http://161.33.171.81:13030

GET http://161.33.171.81:13030
# 200 HTML

GET http://161.33.171.81:13030/feed
# 200 HTML

GET http://161.33.171.81:13030/profile/downingmoon
# 200 HTML
```

CLI compatibility check:

```text
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 \
node dist/cli/index.js doctor
# Overall: ready (6 ready, 0 attention)
# API: reachable and compatible
# ingestion token valid: yes (200)
```

Browser smoke:

```text
Playwright navigate http://161.33.171.81:13030/feed
# title: Public Feed — AgentFeed

Playwright navigate http://161.33.171.81:13030/profile/downingmoon
# profile page rendered with Worklogs tabpanel
```

## Known Observation

> [!warning]
> 미로그인 브라우저에서 public pages 진입 시 `/v1/auth/me`가 `401 Unauthorized`를 반환하며 브라우저 콘솔에 resource error가 1개 기록된다. 페이지 렌더링은 성공한다. 이 동작이 의도된 guest-session 확인인지, 콘솔 노이즈를 줄여야 하는 UX 품질 이슈인지는 별도 pass에서 판단한다.

## Follow-up

- 미로그인 public page에서 `/auth/me` 401이 콘솔 에러로 보이는 문제를 UX/observability 기준으로 재검토.
- 배포 스크립트가 frontend build/start 대기 중 초기 curl이 실패할 수 있으므로, 필요하면 `server-deploy.sh --up` 후 frontend ready wait를 명시적으로 추가.
