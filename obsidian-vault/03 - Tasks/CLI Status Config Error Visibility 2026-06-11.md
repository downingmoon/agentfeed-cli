---
title: CLI Status Config Error Visibility 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/error-visibility
  - agentfeed/contract
status: completed
aliases:
  - 2026-06-11 CLI status damaged config visibility
---

# CLI Status Config Error Visibility 2026-06-11

> [!success] 결론
> `agentfeed status`가 손상된 `.agentfeed/config.json`을 “project not initialized”로 오해하게 만들던 silent fallback을 제거했다. 이제 human/JSON 출력 모두에서 설정 파일 손상과 복구 명령을 명확히 보여준다.

## 문제

- 기존 `cmdStatus`는 `resolveProjectRoot()` 또는 `loadProjectConfig()` 실패를 한 줄 `catch`로 삼켰다.
- 이 때문에 `.agentfeed/config.json`이 존재하지만 invalid JSON이거나 unreadable인 경우에도 `Project: not initialized`처럼 보였다.
- 사용자는 이미 초기화된 프로젝트의 설정 손상을 `agentfeed init` 누락으로 오해할 수 있었다.

## 수정

- `src/cli/status-project.ts` 추가.
  - status 전용 project resolution 책임을 분리했다.
  - `.agentfeed` directory가 존재하는 상태에서 config load가 실패하면 `configError`를 보존한다.
- `src/cli/index.ts` status 출력 보강.
  - Readiness: `Project: config unreadable → agentfeed init --force`
  - Human Project section: `Project initialized: error`, `Project config error: ...`
  - JSON: `project.config_error`, `warnings`, `next_actions`에 복구 경로 노출.
- `tests/cli-status-config-error.test.ts` 추가.
  - human status와 JSON status가 손상된 config를 명확히 표시하는지 고정했다.

## 검증 evidence

- Red 확인: 새 focused test가 기존 구현에서 `Project: not initialized` 출력 때문에 실패.
- `npm run build`: 통과.
- `npx vitest run tests/cli-status-config-error.test.ts tests/cli-status-doctor.test.ts --reporter=verbose`: 2 files / 39 tests passed.
- `npm test -- --run`: 41 files / 621 tests passed.
- `git diff --check`: 통과.
- LOC check:
  - `src/cli/status-project.ts`: 25 pure LOC.
  - `tests/cli-status-config-error.test.ts`: 79 pure LOC.
  - `src/cli/index.ts`: inherited 3,446 pure LOC. 이번 변경은 status helper를 새 파일로 빼서 추가 로직 누적을 줄였지만, CLI entrypoint 자체는 별도 refactor backlog로 남는다.

> [!warning] LSP caveat
> local `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행하지 못했다. 대신 `tsc` build와 vitest를 fresh evidence로 사용했다.

## 후행 과제

- `src/cli/index.ts`는 여전히 oversized entrypoint다. 신규 기능 추가 없이 다음 정리 slice에서 command별 orchestration을 더 작은 module로 분리할 수 있다.
- 동일 패턴으로 `doctor`가 config 손상을 `not initialized`로 오해시키는지 별도 확인한다.
