---
title: Commercial Readiness Hardening - CLI Codex Parallel Tool Collection 2026-06-01
aliases:
  - CLI Codex Parallel Tool Collection
  - Codex Parallel Tool Metrics
  - multi_tool_use parallel collection
tags:
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/codex
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - CLI Codex Parallel Tool Collection 2026-06-01

## 목적

Codex transcript가 여러 tool call을 하나의 `multi_tool_use.parallel` wrapper로 기록하는 경우에도 AgentFeed CLI가 실제 실행된 nested 도구·명령·테스트 수를 놓치지 않도록 수집기를 보강했습니다.

> [!danger]
> 이 gap을 방치하면 parallel 작업이 wrapper 1건으로만 집계되어 `tool_calls`, `commands_run`, `tests_run`이 실제 작업량보다 작게 보입니다. AgentFeed의 핵심 가치가 “로컬 에이전트 작업 증거를 정확히 공유”하는 것이므로 P1 품질 리스크로 처리했습니다.

## 발견한 gap

- 기존 Codex parser는 `payload.type=function_call`마다 `tool_calls += 1`만 수행했습니다.
- `payload.name=exec_command`일 때만 shell command/test metric을 집계했습니다.
- 따라서 `payload.name=multi_tool_use.parallel` 내부의 `tool_uses[]`에 `functions.exec_command`, `functions.write_stdin`, `functions.update_plan` 등이 들어오면 nested tool evidence가 metrics에 반영되지 않았습니다.

## Acceptance Criteria

- [x] `multi_tool_use.parallel` wrapper 내부 `tool_uses[]`를 nested tool call 수로 확장한다.
- [x] nested `functions.exec_command`의 `cmd`/`command`를 `commands_run`에 포함한다.
- [x] nested test command는 기존 `isTestCommand` 판정으로 `tests_run`/`tests_passed`에 포함한다.
- [x] nested subagent call은 wrapper output 실패 여부와 연결 가능한 pending call로 추적한다.
- [x] 기존 direct Codex `exec_command`, `spawn_agent`, custom tool, patch parsing 회귀를 깨지 않는다.
- [x] Vault 문서는 [[Collection System]]과 [[Active Tasks]]에 연결한다.

## 구현 결과

- `src/collectors/agent-session.ts`
  - `codexCallArguments`, `codexNestedToolName`, `codexNestedToolParameters` helper를 추가했습니다.
  - `multi_tool_use.parallel` wrapper는 wrapper 1건 대신 nested `tool_uses.length` 기준으로 `tool_calls`를 집계합니다.
  - nested `functions.exec_command`는 direct `exec_command`와 같은 command/test metric path를 탑니다.
  - pending subagent tracking을 `count` 기반으로 바꿔 wrapper 안에 여러 subagent launch가 있을 때도 undercount하지 않도록 했습니다.
- `tests/session-collector.test.ts`
  - `expands Codex parallel tool wrappers into nested command and tool metrics` regression을 추가했습니다.

## 검증 증거

- Red test 확인:
  - `npm test -- --run tests/session-collector.test.ts -t "parallel tool"` → 수정 전 `tool_calls` 1 vs expected 4로 실패.
- Targeted:
  - `npm test -- --run tests/session-collector.test.ts -t "parallel tool"` → 1 passed.
  - `npm test -- --run tests/session-collector.test.ts` → 62 passed.
- CLI full:
  - `npm run typecheck` → passed.
  - `npm run build` → passed.
  - `npm test -- --run` → 20 files / 281 tests passed.
  - `npm run release:preflight` → passed; trusted publishing/toolchain/tarball/CLI smoke validated.
- Cross-repo integration:
  - `agentfeed-dev ./scripts/test-all.sh` → passed.
  - Dev OpenAPI gate: operations 70 / client contracts 67 / response field contracts 22.
  - CLI: 281 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 256 pytest, Alembic offline migration chain.

## 관련 링크

- [[Collection System#2026-06-01 Codex parallel tool wrapper 수집 보강]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Frontend Backend Response Schema Drift Gate 2026-06-01]]

> [!success]
> Codex parallel tool wrapper가 들어와도 AgentFeed CLI는 wrapper가 아니라 실제 nested 작업 단위에 가까운 metrics를 생성합니다.
