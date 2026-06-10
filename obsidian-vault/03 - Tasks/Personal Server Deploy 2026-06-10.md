---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/deploy
  - agentfeed/server-test
  - agentfeed/frontend
  - verification
status: done
aliases:
  - 2026-06-10 personal server deploy
  - 2026-06-10 Personal Server Deploy
---

# Personal Server Deploy 2026-06-10

> [!success]
> 사용자의 명시 요청으로 개인서버 `161.33.171.81`에 AgentFeed 최신 작업분을 동기화하고 app 컨테이너를 재생성했다.

## Latest Deploy: project visibility select guard

### Deployed Sources

- [[AgentFeed CLI]] / docs: `25d4805 Record why personal server deploy was run`
- [[AgentFeed Frontend]]: `5967f56 Parse project visibility selects explicitly`
- [[AgentFeed Backend]]: `9abcc26 Mark browser sessions without probing guests`
- [[AgentFeed Dev]]: `622293e Gate strict client error response schemas`

### Command

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
./scripts/server-deploy.sh --execute --up
```

### Verification Evidence

| 항목 | 결과 |
| --- | --- |
| Backend container | `healthy` |
| Frontend container | `healthy` |
| Postgres container | `healthy` |
| `GET /v1/health` | `200` |
| `GET /v1/metadata` | `200` |
| `GET /` | `200` |
| `GET /feed` | `200` |
| `GET /cli/authorize` | `200` |

`/v1/metadata` 응답은 `api_version: v1`, `contract_version: 2026-06-03`, `review_base_url: http://161.33.171.81:13030`으로 확인했다.

### Known Observation

- Frontend는 컨테이너 재생성 직후 약 40초 정도 `connection refused` 상태였고, 이후 정상적으로 `200` 응답으로 전환됐다.
- 이번 배포는 사용자의 명시 요청에 따른 1회 배포다. 기존 commercial-readiness goal의 기본 정책은 여전히 “서버/인프라/CICD 보류”로 유지한다.

### Follow-up

- [ ] 실제 브라우저 로그인 플로우 smoke test
- [ ] `agentfeed login -> collect -> publish -> review` 전체 원격 플로우 재검증
- [ ] 서버 DB 초기화가 필요한 테스트 전에는 별도 승인 후 진행

## Previous Deploy: CLI authorize guest probe cleanup

### Deployed Sources

- [[AgentFeed Frontend]]: `9dcb7b2 Skip CLI auth probes for signed-out browsers`
- [[AgentFeed Backend]]: `9abcc26 Mark browser sessions without probing guests`
- [[AgentFeed CLI]] / docs: `6770558 Document personal server deploy`
- [[AgentFeed Dev]] orchestration: `622293e Gate strict client error response schemas`

### 같이 반영된 프론트 수정

- `/cli/authorize`에서 브라우저 세션 마커가 없으면 `/auth/me`를 호출하지 않도록 변경했다.
- CLI 승인 페이지의 세션 저장/복구 로직과 표시 패널을 분리해 `CliAuthorizePage.tsx`를 250 pure LOC 이하로 낮췄다.
- 브라우저 세션 마커는 인증 수단이 아니라 비밀이 아닌 probe hint로만 유지한다.

### Command

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
./scripts/server-deploy.sh --execute --up
```

### Verification Evidence

- Frontend
  - `npm run test:contracts` 통과
  - `npm run lint` 통과
  - `NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 ... npm run build` 통과
- Cross-repo
  - `node scripts/check-openapi-contract.mjs` 통과
  - `bash scripts/test-all.sh` 통과
    - CLI: 591 tests passed, release preflight passed, audit 0 vulnerabilities
    - Frontend CI: typecheck, audit, contract tests, mock API compatibility, production build 통과
    - Backend: 428 tests passed, 1 upstream Starlette/httpx deprecation warning
- Server deploy
  - backend: `0.0.0.0:18080->8000`, healthy
  - frontend: `0.0.0.0:13030->3000`, healthy
  - postgres: `127.0.0.1:15432->5432`, healthy
  - `http://161.33.171.81:18080/v1/metadata` returns `v1/2026-06-03`
  - `http://161.33.171.81:13030/cli/authorize` returns `HTTP/1.1 200 OK`
  - `http://161.33.171.81:13030/feed` returns `HTTP/1.1 200 OK`
- Browser surface
  - Playwright로 `http://161.33.171.81:13030/cli/authorize` 접속
  - 이번 로드의 API 네트워크 요청은 `/v1/metadata`만 확인
  - 새 콘솔 warning/error 없음

### Follow-up

- [ ] 실제 GitHub OAuth 승인 플로우는 사용자의 브라우저 세션/계정 의도에 맞춰 수동 스모크 테스트한다.
- [ ] 공개 도메인/HTTPS 적용 전까지 개인서버는 IP + explicit insecure 설정으로만 테스트한다.

---

## Earlier Deploy: strict production settings contracts

### Deployed Sources

- CLI/docs: `c1ae764 Document production settings contract split`
- Frontend: `46828e1 Reject malformed frontend error envelopes`
- Backend: `0d1a717 Split production settings contracts`
- Dev orchestration: `622293e Gate strict client error response schemas`

### Command

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
./scripts/server-deploy.sh --execute --up
```

### Result

Remote `docker compose ps` after deploy:

```text
agentfeed-server-backend-1    Up / healthy    0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   Up / healthy    0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   Up / healthy    127.0.0.1:15432->5432/tcp
```

### Verification Evidence

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

### Known Observation

> [!warning]
> 미로그인 브라우저에서 public pages 진입 시 `/v1/auth/me`가 `401 Unauthorized`를 반환하며 브라우저 콘솔에 resource error가 1개 기록된다. 페이지 렌더링은 성공한다. 이후 guest auth probe cleanup pass에서 public page console noise를 줄였다.

### Follow-up

- 배포 스크립트가 frontend build/start 대기 중 초기 curl이 실패할 수 있으므로, 필요하면 `server-deploy.sh --up` 후 frontend ready wait를 명시적으로 추가.
