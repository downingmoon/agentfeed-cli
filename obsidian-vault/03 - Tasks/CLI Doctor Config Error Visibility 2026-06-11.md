---
title: CLI Doctor Config Error Visibility 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/error-visibility
  - agentfeed/contract
status: completed
aliases:
  - 2026-06-11 CLI doctor damaged config visibility
---

# CLI Doctor Config Error Visibility 2026-06-11

> [!success] 결론
> `agentfeed doctor`도 손상된 `.agentfeed/config.json`을 “project not initialized”로 오해하게 만들던 fallback을 제거했다. 이제 human/JSON 진단 모두에서 config 손상과 복구 명령을 명확히 보여준다.

## 문제

- [[CLI Status Config Error Visibility 2026-06-11]]에서 `status`는 보강됐지만 `doctor`는 여전히 `loadProjectConfig()` 실패를 단순 `projectConfigValid = false`로 접었다.
- `.agentfeed/config.json`이 존재하지만 invalid JSON인 경우에도 다음처럼 표시됐다.
  - `Project: not initialized → git init && agentfeed init`
  - `Collection: unavailable until project is initialized`
- 실제 필요한 복구는 일반 init이 아니라 config 백업/재생성을 유도하는 `agentfeed init --force`였다.

## 수정

- `cmdDoctor`가 `resolveStatusProject()`를 재사용하도록 변경했다.
- `doctorReadinessItems()`와 `doctorNextActions()`에 `projectConfigError`를 전달한다.
- Human doctor 출력:
  - `Project: config unreadable → agentfeed init --force`
  - `Collection: unavailable because project config is unreadable → agentfeed init --force`
  - Project checks에 `project config error: ...` 표시.
- JSON doctor 출력:
  - `readiness`와 `priority_actions`에 config unreadable 복구 경로 포함.
  - `project` checks에 `project config error` 포함.
  - `collection` cursor label이 `unavailable (project config unreadable)`으로 구분됨.
  - `warnings`와 `next_actions`에 복구 경로 포함.

## 검증 evidence

- Red 확인: `tests/cli-doctor-config-error.test.ts`가 기존 구현에서 `Project: not initialized` 출력 때문에 실패.
- `npm run build`: 통과.
- `npx vitest run tests/cli-doctor-config-error.test.ts tests/cli-status-config-error.test.ts tests/cli-status-doctor.test.ts --reporter=verbose`: 3 files / 41 tests passed.
- `npm test -- --run`: 42 files / 623 tests passed.
- `git diff --check`: 통과.
- LOC check:
  - `tests/cli-doctor-config-error.test.ts`: 94 pure LOC.
  - `src/cli/index.ts`: inherited 3,470 pure LOC.

> [!warning] LSP caveat
> local `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행하지 못했다. 대신 `tsc` build와 vitest를 fresh evidence로 사용했다.

## 후행 과제

- `src/cli/index.ts`는 status/doctor까지 보강되며 여전히 oversized entrypoint다. 다음 CLI slice에서는 신규 기능 추가 없이 status/doctor orchestration을 더 작은 module로 분리하는 것이 좋다.
- `collect`, `publish`, `drafts` 등 다른 command에서도 “파일은 존재하지만 손상됨”을 “없음”으로 숨기는 fallback이 남아 있는지 계속 점검한다.
