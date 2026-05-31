---
title: Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31
aliases:
  - CLI configured command trust boundary
  - CLI argv token guard
created: 2026-05-31
updated: 2026-05-31
status: implemented
tags:
  - agentfeed/cli
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/task
---

# Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31

> [!success]
> `--run-configured-commands`와 token login의 로컬 trust boundary를 더 보수적으로 고정했습니다.

## 목적

AgentFeed CLI는 로컬 repo에서 실행되므로, “몇 번 딸깍으로 공유” UX를 유지하되 repo-local config와 shell/argv가 raw secret을 우회 노출하지 않게 해야 합니다.

## 변경 계약

- `agentfeed collect --run-configured-commands` / `agentfeed share --run-configured-commands`는 여전히 명시적 opt-in일 때만 repo-local test/build command를 실행합니다.
- 구성된 command의 첫 executable이 shell interpreter이면 실행 전에 거부합니다.
  - 예: `sh`, `bash`, `zsh`, `cmd.exe`, `powershell`, `pwsh`.
  - 권장: `npm test`, `npm run build`, `pytest`, `go test ./...`, `make test` 같은 direct command.
- 구성된 command는 `execFile` 기반 direct execution을 유지하고, sensitive environment를 scrub한 상태로 실행합니다.
  - 기본 제거: `AGENTFEED_TOKEN`, npm auth token, cloud credential, common `*_TOKEN` / `*_SECRET` / `*_PASSWORD` / `*_PRIVATE_KEY` 계열.
  - 필요한 경우만 `AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST=NAME1,NAME2`로 명시 통과시킵니다.
- literal `agentfeed login --token <token>`은 기본 비활성화합니다.
  - 권장: `printf '%s' "$TOKEN" | agentfeed login --token-stdin` 또는 `agentfeed login --token -`.
  - 로컬 throwaway dev escape hatch는 `AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1`이 있을 때만 허용합니다.

> [!warning] 유지보수 지침
> repo-local config가 지정한 command는 “trusted repository에서만 명시적으로 실행”되는 경로입니다. 향후 shell wrapper 지원을 되돌리려면 command allowlist, env scrub, test evidence를 함께 재검토해야 합니다.

## 변경 파일

- `src/collectors/test-command.ts`
- `src/utils/shell.ts`
- `src/cli/index.ts`
- `tests/git-draft.test.ts`
- `tests/cli-status-doctor.test.ts`
- `README.md`
- [[AgentFeed CLI README]]

## 검증 증거

- RED: shell wrapper 회귀 테스트가 기존 구현에서 draft resolved + marker side effect로 실패.
- GREEN:
  - `npm test -- --run tests/git-draft.test.ts -t "shell-interpreter|AgentFeed token environment"`
  - `npm run build && npm test -- --run tests/cli-status-doctor.test.ts -t "literal argv token|stdin"`
  - `npm run typecheck`
  - `npm test -- --run` — 238 passed
  - `npm pack --dry-run` — prepack clean/build/typecheck/test passed, package dry-run succeeded
  - `git diff --check`
  - `agentfeed-dev make test` — CLI 238 tests, frontend contracts/build/audit, backend ruff + 201 tests + Alembic offline chain passed

## 관련 영역

- [[Collection System#2026-05-31 Configured command trust boundary]]
- [[Auth & Credential Safety#2026-05-31 Literal argv token guard]]
- [[Active Tasks#P1 후보]]
