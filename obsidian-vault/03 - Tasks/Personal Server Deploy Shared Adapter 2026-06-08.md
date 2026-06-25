---
title: Personal Server Deploy Shared Adapter 2026-06-08
aliases:
  - Shared adapter personal server deploy
status: done
date: 2026-06-08
tags:
  - agentfeed/deploy
  - agentfeed/frontend
  - agentfeed/evidence
---

# Personal Server Deploy Shared Adapter 2026-06-08

> [!success] 배포 완료
> [[Frontend Shared Adapter Fail Closed 2026-06-08]] 변경을 개인 서버 IP-only stack에 반영했다.

## 실행

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
make server-deploy
make server-up
cd /home/ubuntu/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate frontend && docker compose --env-file .env ps
```

## 결과

- Frontend container: `agentfeed-server-frontend-1` 재생성 후 `healthy`.
- Backend container: `agentfeed-server-backend-1` healthy 유지.
- Postgres container: `agentfeed-server-postgres-1` healthy 유지.

## 검증 Evidence

```bash
curl -fsS http://161.33.171.81:18080/v1/metadata | python3 -m json.tool
# data.api_version = v1
# data.contract_version = 2026-06-03
# data.review_base_url = http://161.33.171.81:13030

python3 frontend /feed marker smoke
# {'bytes': 35751, 'AgentFeed': True, '__next': True, 'Public Feed': True}

AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 \
agentfeed doctor --json
# summary.status = ready
# API ready = yes (200)
# API compatibility = yes (v1 / 2026-06-03)
# ingestion token valid = yes (200)
```

## 후행 과제

- [ ] 실제 사용자 브라우저에서 GitHub OAuth credential 입력까지 포함한 live login smoke는 계속 사람 확인 항목으로 유지.
- [ ] `adaptWorklog` detail outcome/timeline fallback 점검 slice 진행 시 동일하게 개인서버 smoke evidence를 갱신.
