---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - deployment
  - personal-server
status: done
---

# Personal Server Deploy 2026-06-10

> [!success] Result
> 개인서버 `161.33.171.81`에 현재 CLI / Frontend / Backend / Dev orchestration 상태를 동기화하고 backend/frontend 컨테이너를 재기동했다.

## Scope

- Target frontend: `http://161.33.171.81:13030`
- Target API: `http://161.33.171.81:18080/v1`
- SSH host alias: `trading-bot`
- Deploy runner: `agentfeed-dev/scripts/server-deploy.sh --execute --up`

## Deployed refs

- CLI docs repo: `f8e61e4` — `Document search query normalization split`
- Backend: `e097edd` — `Split search query normalization contract`
- Frontend: `46828e1` — `Reject malformed frontend error envelopes`
- Dev orchestration: `622293e` — `Gate strict client error response schemas`

## Verification Evidence

```text
local compose config OK
agentfeed-server-backend-1    healthy    0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   healthy    0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   healthy    127.0.0.1:15432->5432/tcp
```

```text
Backend readiness: ready
Database revision: 027_browser_session_version
Migration up_to_date: true
Backend metadata: v1 / 2026-06-03
Frontend root: HTTP 200
Hosted compatibility smoke: HOSTED_COMPATIBILITY_SMOKE_PASSED
Frontend API probes: metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore
```

## Notes

- `agentfeed doctor` in smoke used a temp HOME, so `token missing` is expected and did not block API compatibility.
- Evidence artifact was generated under `agentfeed-dev/.commercial-readiness-evidence/20260610T032025Z-personal-server-deploy/` and is intentionally ignored by git.
- This is still IP-only server-test deployment, not production/domain deployment.

## Follow-up

- [ ] 직접 브라우저에서 GitHub OAuth 로그인 흐름 확인.
- [ ] 실제 `agentfeed login → collect → publish`를 개인 계정 토큰으로 end-to-end 확인.
- [ ] 도메인/HTTPS 준비 후 insecure server-test flags 제거.
