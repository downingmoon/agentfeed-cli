---
title: CLI Status Readiness Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/enterprise-audit
status: done
---

# CLI Status Readiness Refactor 2026-06-11

## 목적

`src/cli/index.ts`가 이미 큰 entrypoint인 상태에서 `status`/`doctor` UX 보강이 계속 누적되고 있었다. 새 기능을 추가하지 않고, `agentfeed status` readiness 계산과 next action 결정 로직을 순수 모듈로 분리해 이후 contract/UX 보강 시 entrypoint 변경 범위를 줄였다.

## 변경

- `src/cli/status-readiness.ts` 추가.
  - `StatusReadinessItem`, `StatusReadinessOptions`, `StatusReadinessSummary` 타입 정의.
  - `statusReadinessItems()` / `statusSummary()` / `setupProgressText()` / `statusNextActions()` 순수 로직 이동.
  - 출력/ANSI/UI formatting은 `src/cli/index.ts`에 남겨 CLI boundary와 domain-ish readiness 계산을 분리.
- `src/cli/index.ts`는 새 모듈을 import해 기존 human/JSON status output을 유지.
- 기존 `doctorPriorityActions()`의 `next_action as string` 타입 단언을 type guard로 제거.

## 검증

- `npm run build` 통과.
- `npx vitest run tests/cli-status-config-error.test.ts tests/cli-doctor-config-error.test.ts tests/cli-status-doctor.test.ts --reporter=verbose` 통과: 3 files / 41 tests.
- `npm test -- --run` 통과: 42 files / 623 tests.
- `git diff --check` 통과.
- hygiene grep 통과: 변경 TS 파일에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `next_action as` 없음.
- LSP diagnostics는 현재 환경에 `typescript-language-server`가 설치되어 있지 않아 실행 불가. `tsc` build와 vitest를 대체 evidence로 사용.

## 남은 리스크

> [!warning]
> `src/cli/index.ts`는 여전히 약 3,488 pure LOC로 oversized entrypoint다. 이번 slice는 status readiness만 분리했으며, 다음 slice에서는 `doctor` readiness/priority action 순수 로직도 별도 모듈로 분리하는 것이 좋다.

## 관련

- [[CLI Status Config Error Visibility 2026-06-11]]
- [[CLI Doctor Config Error Visibility 2026-06-11]]
- [[Active Tasks]]
