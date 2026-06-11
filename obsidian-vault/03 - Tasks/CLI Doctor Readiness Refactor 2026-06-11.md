---
title: CLI Doctor Readiness Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/enterprise-audit
status: done
---

# CLI Doctor Readiness Refactor 2026-06-11

## 목적

`agentfeed doctor`는 CLI-API-Frontend 연결 문제를 사용자가 가장 먼저 확인하는 진단 표면이다. 기존에는 readiness 계산, API compatibility 설명, priority action 정렬, next action 결정이 `src/cli/index.ts`에 함께 쌓여 있어 entrypoint 변경 리스크가 계속 커지고 있었다.

이번 slice는 신규 기능을 추가하지 않고, doctor 진단 계산 로직을 순수 모듈로 분리해 CLI 출력 boundary와 진단 contract 계산을 분리했다.

## 변경

- `src/cli/doctor-readiness.ts` 추가.
  - `DoctorReadinessItem`, `DoctorSummary`, `DoctorPriorityAction` 타입 정의.
  - `doctorReadinessItems()` / `doctorSummary()` / `doctorPriorityActions()` / `doctorNextActions()` 이동.
  - API reachability/compatibility 결과는 structural 타입으로 받아 API client 구현 세부 타입과 CLI readiness 계산을 분리.
- `src/cli/index.ts`는 doctor 출력(`printDoctorSummary`, `printDoctorPriorityActions`)과 command orchestration만 유지.
- 이전 slice의 `status-readiness.ts`와 같은 패턴으로 `doctor` pure logic을 entrypoint 밖에 둠.

## 검증

- `npm run build` 통과.
- `npx vitest run tests/cli-doctor-config-error.test.ts tests/cli-status-doctor.test.ts --reporter=verbose` 통과: 2 files / 39 tests.
- `npm test -- --run` 통과: 42 files / 623 tests.
- `git diff --check` 통과.
- 변경 TS 파일 hygiene grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `next_action as`, `: any`, `enum` 없음.
- LSP diagnostics는 현재 환경에 `typescript-language-server`가 설치되어 있지 않아 실행 불가. `tsc` build와 vitest를 대체 evidence로 사용.

## LOC 상태

- `src/cli/index.ts`: 약 3,488 pure LOC → 약 3,350 pure LOC.
- `src/cli/doctor-readiness.ts`: 약 160 pure LOC.
- `src/cli/status-readiness.ts`: 약 107 pure LOC.

## 후행 과제

> [!warning]
> `src/cli/index.ts`는 여전히 oversized entrypoint다. 다음 slice는 `login`/`rotate` browser-auth orchestration 또는 `publish` preflight 출력/next-action 계산을 모듈화하는 것이 좋다. 단, 신규 기능 추가 없이 기존 test surface로 동작 보존을 먼저 증명해야 한다.

## 관련

- [[CLI Status Readiness Refactor 2026-06-11]]
- [[CLI Doctor Config Error Visibility 2026-06-11]]
- [[Active Tasks]]
