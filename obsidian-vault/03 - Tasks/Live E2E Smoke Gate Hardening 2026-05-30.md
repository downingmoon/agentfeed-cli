---
title: Live E2E Smoke Gate Hardening 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/e2e
  - agentfeed/commercial-readiness
  - project/tasks
status: done
aliases:
  - 2026-05-30 Live smoke E2E gate
  - CLI API Frontend smoke hardening
---

# Live E2E Smoke Gate Hardening 2026-05-30

> [!success]
> `agentfeed-dev`의 live smoke가 실제 Compose dev stack에서 CLI → Backend → Frontend review route → publish → feed까지 검증하도록 다시 안정화했습니다.

## 배경

[[Commercial Readiness Audit 2026-05-30]] 후 backend production-safety와 shared rate-limit 설정이 강화되면서, smoke script가 `docker compose exec -e ENVIRONMENT=test`로 backend 내부 helper를 실행하는 방식은 더 이상 실제 dev stack 계약과 맞지 않았습니다.

## 수정한 계약

- smoke helper는 실행 중인 backend container의 실제 `ENVIRONMENT=development` 설정을 그대로 사용합니다.
- backend/frontend readiness는 one-shot `curl` 대신 deadline 기반 `wait_http()`로 대기합니다.
- development SQL echo 로그가 seed JSON 앞에 섞여도 마지막 JSON line만 읽어 seed 결과를 파싱합니다.
- CLI upload source의 raw `session_id`는 공개/저장 전송 시 hash alias(`session_<sha256-prefix>`)로 바뀌는 개인정보 계약을 smoke에서 검증합니다.
- `compose.yaml`과 `.env.example`에 backend 운영 키 `RATE_LIMIT_STORE`, `TRUSTED_PROXY_IPS`를 노출했습니다.

## 검증

- `./scripts/smoke-e2e.sh` → passed
  - CLI `share --json --source cursor --session-file ... --note ... --all --no-clipboard`
  - `/v1/worklogs/{id}/review`
  - `/worklogs/{id}/review` frontend route
  - `/v1/worklogs/{id}/publish`
  - `/v1/worklogs/{id}` + `/v1/feed?agent=cursor&time_range=week`
- `../agentfeed-dev/scripts/test-all.sh` → passed
  - CLI 154 tests + typecheck + `npm audit --omit=dev`
  - Frontend contract tests + audit + production build
  - Backend `ruff check .` + 95 tests + Alembic offline migration chain

## 관련 노트

- [[Integration - CLI Backend Frontend#2026-05-30 Live E2E smoke gate hardening]]
- [[Runtime Configuration#2026-05-30 Backend RATE_LIMIT_STORE]]
- [[Auth & Credential Safety#2026-05-30 Shared database rate-limit store]]
- [[Active Tasks#P0 / 검증]]
