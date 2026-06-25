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
> 개인 서버 현재 로컬 배포 서버(과거 off-server alias: `trading-bot`)에서 AgentFeed Backend/Frontend/Postgres compose stack이 정상 기동했고, CLI → API → Frontend review → public feed 흐름이 IP-only server-test 환경에서 검증됐다. 검증 후 서버 데이터는 다시 0건으로 초기화했다.

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

> [!success] 2026-06-05 compatibility fix
> `review_base_url=http://161.33.171.81:13030` is now accepted only under the explicit IP-only server-test flag, so the previous `AgentFeed API 계약 불일치` banner no longer appears.


- Playwright opened `http://161.33.171.81:13030/feed`.
- Page title: `Public Feed — AgentFeed`.
- API compatibility/config banners are absent. A signed-out browser may still show the expected `/v1/auth/me` 401 resource entry while rendering public pages.
- API config banner absent.
- CSP `connect-src` includes `http://161.33.171.81:18080`.

## CLI login compatibility fix

> [!success]
> `AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 agentfeed login`이 더 이상 `API compatibility check failed ... HTTP 200`에서 멈추지 않는다.

원인:

- Backend metadata의 `review_base_url`이 `http://161.33.171.81:13030`이었다.
- CLI는 HTTPS 또는 localhost review origin만 신뢰했고, Frontend에서 이미 허용한 “명시적 IP-only server-test” 예외를 CLI에는 아직 적용하지 않았다.

수정:

- CLI는 `AGENTFEED_ALLOW_INSECURE_API=1`이 있을 때만 공개 IPv4 HTTP review/authorize origin을 허용한다.
- `10.x`, `172.16/12`, `192.168/16`, `127.x`, CGNAT, link-local, hostname HTTP origin은 계속 차단한다.
- CLI authorize URL도 API host와 같은 공개 IPv4 HTTP origin일 때만 허용한다.

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

## End-to-end evidence

> [!info] GitHub OAuth 자동화 범위
> Playwright 브라우저에는 GitHub 로그인 쿠키가 없어 실제 GitHub credential 입력 단계는 자동화하지 않았다. 대신 서버에 임시 테스트 사용자를 만들고 backend와 동일한 browser session cookie를 발급해, “로그인된 브라우저가 CLI session을 승인한다” 이후의 전체 product flow를 검증했다. 이 임시 데이터는 reset에서 삭제됐다.

검증된 흐름:

- CLI `agentfeed login --no-open --browser`
  - API compatibility: `yes (v1 / 2026-06-03)`
  - Browser approval page: signed-out 상태에서 global “세션 만료” banner 없음.
  - Browser approval page: signed-in 상태에서 `AgentFeed E2E @agentfeed_e2e` 계정 표시.
  - Terminal approval code 입력 후 “승인 완료”.
  - CLI token exchange 완료, token expiry `2026-09-03T12:42:23.599Z`.
- CLI `agentfeed status`
  - token configured, API base `http://161.33.171.81:18080/v1`.
- CLI `agentfeed collect --explain --all --run-configured-commands`
  - draft `draft_20260605_214246_5290` 생성.
- CLI `agentfeed publish --id draft_20260605_214246_5290 --yes --json --no-clipboard --no-open-review`
  - worklog `4d97e648-1b1b-4b91-a267-599deff3b1f7`
  - status `needs_review`
  - review URL `http://161.33.171.81:13030/worklogs/4d97e648-1b1b-4b91-a267-599deff3b1f7/review`
- Frontend review page
  - title, summary, collection evidence, privacy findings, publish controls rendered.
  - `Publish public` click succeeded and redirected to public worklog detail.
- Frontend feed
  - public feed showed `1개의 worklog`.
  - published item `Explored project with AI agent` appeared in feed and trending area.

> [!note]
> 임시 프로젝트에는 실제 agent transcript가 없어 collection quality는 `unknown`, metrics는 `0 files · +0 -0`였다. 이는 서버 연결 E2E 목적에는 충분하지만, 수집 품질 검증 evidence는 별도 로컬/CI commercial-readiness 문서를 따른다.

## Reset evidence

검증 후 서버 DB 앱 데이터는 초기화했다. `alembic_version`은 유지했다.

```text
before users=1
before tokens=2
before worklogs=1
before projects=1
before cli_sessions=7

after users=0
after tokens=0
after worklogs=0
after projects=0
after cli_sessions=0
```

최종 확인:

```text
/health/ready -> ready, migration head 027_browser_session_version
/v1/metadata -> v1 / 2026-06-03, review_base_url http://161.33.171.81:13030
/feed -> 0개의 worklog · 이번 주
```

## 남은 사람 작업

- 실제 사용자 브라우저에서 GitHub OAuth credential 입력까지 포함한 live login을 한 번 수행.
- 서버 방화벽/security group에서 `13030`, `18080`만 필요한 범위로 허용.
- Postgres volume backup 위치/주기를 결정.

> [!warning] Production readiness 아님
> 이 evidence는 IP-only server smoke다. HTTPS domain, reverse proxy, production secret/host policy, DNS가 준비된 production readiness 증거는 아니다.
