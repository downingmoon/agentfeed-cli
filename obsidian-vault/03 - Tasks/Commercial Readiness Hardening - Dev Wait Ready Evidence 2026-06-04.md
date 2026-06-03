---
title: Commercial Readiness Hardening - Dev Wait Ready Evidence 2026-06-04
aliases:
  - Dev wait-ready evidence artifact
  - Local stack readiness JSON evidence
tags:
  - agentfeed/commercial-readiness
  - agentfeed/dev
  - agentfeed/evidence
  - obsidian/task
status: done
created: 2026-06-04
---

# Commercial Readiness Hardening - Dev Wait Ready Evidence 2026-06-04

> [!summary]
> `agentfeed-dev`의 local Compose readiness gate가 이제 선택적으로 machine-readable JSON evidence를 남깁니다. Self-hosted commercial readiness workflow는 local stack 시작 직후 이 evidence를 artifact로 업로드하므로, readiness 실패를 로그 스크래핑 없이 진단할 수 있습니다.

## 변경 요약

- `scripts/wait-ready.sh`
  - `AGENTFEED_READY_EVIDENCE_FILE`이 설정되면 readiness 결과를 JSON으로 atomic write합니다.
  - JSON에는 `status`, `message`, timestamps, elapsed/timeout/poll seconds, env file, service health, frontend URL, backend readiness URL이 포함됩니다.
- `.github/workflows/commercial-readiness.yml`
  - local stack 시작 단계에서 `${{ runner.temp }}/commercial-readiness-evidence/local-stack-readiness.json`을 쓰도록 설정했습니다.
- `scripts/commercial-readiness.sh`
  - manifest에 `local_stack_readiness: local-stack-readiness.json` evidence path를 기록합니다.
- `scripts/test-wait-ready.sh`
  - healthy/missing/unhealthy service 경로에서 JSON evidence shape를 검증합니다.
- `scripts/test-commercial-readiness-gate.sh`, `scripts/test-commercial-readiness-exec.sh`
  - workflow/env/manifest evidence contract가 빠지면 fail-closed 되도록 보강했습니다.
- `README.md`
  - `AGENTFEED_READY_EVIDENCE_FILE=.commercial-readiness-evidence/local-stack-readiness.json make wait` 사용법을 추가했습니다.

## 운영 계약

```bash
AGENTFEED_READY_EVIDENCE_FILE=.commercial-readiness-evidence/local-stack-readiness.json make wait
```

> [!important]
> 이 evidence는 기본 local 개발 흐름을 바꾸지 않습니다. 환경변수가 설정된 경우에만 JSON을 쓰며, 기존 `make wait` 출력과 exit code는 그대로 유지합니다.

## 검증

- `bash -n scripts/wait-ready.sh`
- `bash -n scripts/test-wait-ready.sh`
- `./scripts/test-wait-ready.sh`
- `./scripts/test-commercial-readiness-gate.sh`
- `./scripts/test-commercial-readiness-exec.sh`
- `./scripts/test-workflow-validity.sh`
- `docker compose --env-file .env.example config --quiet`
- `./scripts/test-all.sh`
  - AgentFeed CLI: 396 tests, typecheck, release preflight, npm audit 0 vulnerabilities
  - Frontend: lint/typecheck, mock API compatibility, production build, npm audit 0 vulnerabilities
  - Backend: Ruff all checks, 373 pytest tests, Alembic offline migration chain
  - Dev contracts: wait-ready, commercial-readiness, workflow validity, OpenAPI contract gate

## 연결 문서

- [[Commercial Readiness Hardening - Cached Publish Cursor and Branch Drift Gates 2026-06-04]]
- [[Commercial Readiness Hardening - Windows Package Wrapper Smoke 2026-06-04]]
- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
