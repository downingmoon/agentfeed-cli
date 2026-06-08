---
title: Personal Server Deploy Worklog Source Viewer 2026-06-08
aliases:
  - Worklog source viewer deploy
status: done
date: 2026-06-08
tags:
  - agentfeed/deploy
  - agentfeed/frontend
  - agentfeed/server-test
  - agentfeed/evidence
---

# Personal Server Deploy Worklog Source Viewer 2026-06-08

> [!success] 완료
> [[Frontend Worklog Source Viewer Guard 2026-06-08]] 변경을 개인 서버 IP-only stack에 반영했다.

## 배포 대상

- Frontend commit: `e3aba5e` (`Guard worklog source viewer adapters`)
- Docs commit: `6f4a068` (`Document worklog source viewer guard`)
- Server: `161.33.171.81`
- Frontend: `http://161.33.171.81:13030`
- API: `http://161.33.171.81:18080/v1`

## 실행 내용

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
./scripts/server-deploy.sh --execute
./scripts/server-deploy.sh --execute --up
ssh trading-bot "cd ~/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate frontend"
```

> [!note]
> `compose.yaml`은 frontend `.next`를 named volume으로 유지한다. 소스 동기화 후 최신 production build 반영을 보장하려면 frontend 컨테이너 강제 재생성이 필요하다.

## 검증 Evidence

```bash
curl -fsS http://161.33.171.81:18080/v1/metadata
# contract_version: 2026-06-03
# review_base_url: http://161.33.171.81:13030

curl -fsSI http://161.33.171.81:13030/feed
# HTTP/1.1 200 OK

AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 \
npm --prefix ../AgentFeed-CLI exec -- agentfeed doctor --json
# summary.status: ready
# ready: 6
# attention: 0
# API ready: yes (200)
# API compatibility: yes (v1 / 2026-06-03)
```

HTML shell smoke:

```text
has_html: True
has_next_payload: True
has_feed_text: True
has_runtime_error: False
length: 35751
```

Docker status:

```text
agentfeed-server-backend-1    healthy   0.0.0.0:18080->8000/tcp
agentfeed-server-frontend-1   healthy   0.0.0.0:13030->3000/tcp
agentfeed-server-postgres-1   healthy   127.0.0.1:15432->5432/tcp
```

## 후행 과제

- [ ] 배포 스크립트에 production frontend 소스 변경 시 `--force-recreate frontend` 또는 `.next` rebuild를 보장하는 옵션을 추가할지 검토.
- [ ] `adaptMetrics` nested `agent_metrics`, `collection_sources`, `models_used`, `agent_modes`의 nullable arrays와 malformed object masking 여부 점검.
