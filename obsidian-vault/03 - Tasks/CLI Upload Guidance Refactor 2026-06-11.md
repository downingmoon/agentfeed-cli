---
title: CLI Upload Guidance Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/enterprise-audit
status: done
---

# CLI Upload Guidance Refactor 2026-06-11

## 목적

`agentfeed share`/`publish`/`collect --upload`의 upload preflight 실패 메시지는 사용자가 오류를 이해하고 바로 복구할 수 있어야 하는 enterprise 품질 표면이다. 기존 `src/cli/index.ts`에는 upload success next-action, API compatibility/token preflight 실패 detail, `Fix first`/`Then retry` recovery message 조립이 command orchestration과 함께 있었다.

이번 slice는 신규 기능 없이 upload guidance 계산을 순수 모듈로 분리해, 오류 표시/복구 순서 contract를 더 작고 검증 가능한 단위로 만들었다.

## 변경

- `src/cli/upload-guidance.ts` 추가.
  - `uploadNextActions()` 분리.
  - `apiCompatibilityFailureDetail()` / `apiCheckFailureDetail()` 분리.
  - `formatUploadRecoveryMessage()` 분리.
  - `apiCompatibilityRecoveryCommands()` / `ingestionTokenRecoveryCommands()` 분리.
  - `UploadPreflightOptions` structural type 분리.
- `src/cli/index.ts`는 실제 API compatibility/token check와 upload command orchestration을 유지하고, recovery/next-action 계산만 import하도록 축소.

## 검증

- `npm run build` 통과.
- `npx vitest run tests/cli-share.test.ts tests/cli-collect.test.ts --reporter=verbose` 통과: 2 files / 77 tests.
- `npm test -- --run` 통과: 42 files / 623 tests.
- `git diff --check` 통과.
- 변경 TS 파일 hygiene grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum` 없음.
- LSP diagnostics는 현재 환경에 `typescript-language-server`가 설치되어 있지 않아 실행 불가. `tsc` build와 vitest를 대체 evidence로 사용.

## LOC 상태

- `src/cli/index.ts`: 약 3,301 pure LOC → 약 3,255 pure LOC.
- `src/cli/upload-guidance.ts`: 약 60 pure LOC.

## 후행 과제

> [!warning]
> `src/cli/index.ts`는 여전히 oversized entrypoint다. 다음 slice는 `reviewUrlHandoffLines()`/review URL handoff result formatting 또는 `preview` next-action 계산을 분리해 upload 후 review handoff UX를 더 작은 단위로 검증하는 것이 좋다.

## 관련

- [[CLI Auth Result Refactor 2026-06-11]]
- [[CLI Doctor Readiness Refactor 2026-06-11]]
- [[CLI Status Readiness Refactor 2026-06-11]]
- [[Active Tasks]]
