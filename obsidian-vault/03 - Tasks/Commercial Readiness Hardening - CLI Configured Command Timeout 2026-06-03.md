---
title: CLI Configured Command Timeout
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/timeout
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Collection System]]"
  - "[[Runtime Configuration]]"
---

# CLI Configured Command Timeout

## 목표

`agentfeed collect/share --run-configured-commands`가 사용자의 test/build command가 멈추는 경우에도 영구 대기하지 않고, 실패한 command evidence를 안전하게 기록한 뒤 다음 수집 단계로 진행하도록 한다.

> [!success]
> configured test/build command timeout을 `AGENTFEED_COMMAND_TIMEOUT_MS`로 조절 가능하게 만들고, timeout 발생 시 `failed_commands`로 fail-closed 처리되는 회귀 테스트를 추가했다.

## 변경

- `AgentFeed-CLI/src/collectors/test-command.ts`
  - configured command 실행 timeout을 `AGENTFEED_COMMAND_TIMEOUT_MS`로 읽도록 추가.
  - 잘못된 값이거나 미설정이면 기존 기본값 `120000ms` 유지.
  - test command가 timeout/fail이어도 build command까지 실행해 가능한 evidence를 계속 수집한다.
- `AgentFeed-CLI/src/utils/shell.ts`
  - command timeout 실패 시 stderr가 비어 있으면 `timed out after <ms>ms` 진단을 남긴다.
- `AgentFeed-CLI/tests/test-command.test.ts`
  - `AGENTFEED_COMMAND_TIMEOUT_MS=50`에서 5초짜리 test command가 2초 안에 종료되고 `failed_commands: 1`, `commands_run: 2`로 기록되는 회귀 테스트 추가.

## 검증

```bash
npm test -- --run tests/test-command.test.ts
npm run prepack
```

결과:

- targeted test: 1 file / 5 tests passed
- release gate local: build, typecheck, 23 files / 383 tests passed

## 남은 리스크

- hosted 상용 readiness는 코드 문제가 아니라 외부 배포/DNS 상태에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
