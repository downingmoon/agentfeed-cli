---
title: Commercial Readiness Hardening - Dev Smoke Package Entrypoint 2026-06-01
aliases:
  - Dev smoke package entrypoint gate
  - 2026-06-01 dev smoke bin 실행 검증
tags:
  - agentfeed/commercial-readiness
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/release
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Dev Smoke Package Entrypoint 2026-06-01

> [!abstract] 목적
> Local E2E smoke가 개발 편의용 `node dist/cli/index.js` 직접 실행이 아니라, npm package의 `bin.agentfeed` entrypoint를 통해 CLI를 실행하도록 보강합니다.

## 문제

- `agentfeed-dev/scripts/smoke-e2e.sh`는 local CLI build 후 `node "$CLI_DIR/dist/cli/index.js" ...`로 smoke를 실행했습니다.
- 이 경로는 package `bin` mapping, executable mode, npm exec path 같은 실제 사용자 설치/실행 계약을 우회합니다.
- 따라서 package entrypoint가 깨져도 smoke가 통과할 수 있었습니다.

## 수정

- `smoke-e2e.sh`에서 `CLI_RUN=(npm --prefix "$CLI_DIR" exec -- agentfeed)`를 정의했습니다.
- smoke init/share upload 경로가 모두 `"${CLI_RUN[@]}" ...`를 사용합니다.
- `test-all.sh`에 source gate를 추가해 direct `node "$CLI_DIR/dist/cli/index.js"` 회귀를 차단합니다.

## 검증 증거

- `bash -n scripts/smoke-e2e.sh && bash -n scripts/test-all.sh`
- `npm --prefix ../AgentFeed-CLI run build` 후 `npm --prefix /Users/downing/PersonalProjects/AgentFeed-CLI exec -- agentfeed --help`
- `agentfeed-dev ./scripts/test-all.sh` → OpenAPI contract gate passed, CLI 285 tests/typecheck/release preflight/audit passed, Frontend CI/build/contracts/audit passed, Backend ruff/260 tests/Alembic offline chain passed

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Dev smoke package entrypoint gate]]
- [[Active Tasks]]
