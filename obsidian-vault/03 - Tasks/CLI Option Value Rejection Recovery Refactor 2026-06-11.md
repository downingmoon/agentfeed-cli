---
title: CLI Option Value Rejection Recovery Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
---

# CLI Option Value Rejection Recovery Refactor 2026-06-11

## 결과

`agentfeed status --json=true`처럼 값이 허용되지 않는 flag에 `=` 값이 붙었을 때의 recovery wording을 `optionDoesNotAcceptValueMessage()`로 분리했다.

- Parser boundary: `src/cli/index.ts`의 `validateCommandArgs()`는 flag value rejection 감지만 담당한다.
- Message boundary: `src/cli/command-recovery.ts`가 command-specific help hint 조립을 담당한다.
- Contract: CLI-Frontend-Backend API/response 계약 변경 없음.
- Scope: 서버, 배포, infra, CICD 작업 없음.

## 변경 파일

- `src/cli/command-recovery.ts`
  - `optionDoesNotAcceptValueMessage(command, optionName)` 추가.
- `src/cli/index.ts`
  - flag에 값이 붙은 error 조립을 helper 호출로 교체.
- `tests/cli-command-recovery-extra.test.ts`
  - option value rejection recovery wording 단위 테스트 추가.

## 검증

- Red test 확인: helper 추가 전 `optionDoesNotAcceptValueMessage is not a function` 실패 확인.
- `npm run build`: 통과.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose`: 2 files, 52 tests 통과.
- CLI smoke: `node dist/cli/index.js status --json=true` exit 1, stderr에 `--json does not accept a value.`와 `Run: agentfeed status --help` 확인.
- `npm test -- --run`: 50 files, 662 tests 통과.
- `git diff --check`: 통과.
- strict grep: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LSP diagnostics: `typescript-language-server` 미설치로 실행 불가.

## 크기 / 경계

- `src/cli/command-recovery.ts`: 138 pure LOC.
- `tests/cli-command-recovery-extra.test.ts`: 128 pure LOC.
- `src/cli/index.ts`: 2849 pure LOC, inherited oversized entrypoint defect는 남아 있으나 이번 slice에서 inline recovery responsibility를 추가로 제거했다.

## 후속 후보

- `validateCommandArgs()` conflict branch의 recovery helper/typed violation 결과 분리.
- `unknownOptionError()` 후보 계산을 command spec query helper로 분리해 parser control flow와 suggestion assembly를 더 분리.
