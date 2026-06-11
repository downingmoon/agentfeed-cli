---
title: CLI Option Value Recovery Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
---

# CLI Option Value Recovery Refactor 2026-06-11

## 결과

`agentfeed login --api-base-url`처럼 값이 필요한 long option이 빈 값 또는 다음 값 없음으로 들어올 때의 recovery wording을 `optionRequiresValueMessage()`로 분리했다.

- Parser boundary: `src/cli/index.ts`의 `validateCommandArgs()`는 missing-value 감지만 담당한다.
- Message boundary: `src/cli/command-recovery.ts`가 command-specific help hint 조립을 담당한다.
- Contract: CLI-Frontend-Backend API/response 계약 변경 없음.
- Scope: 서버, 배포, infra, CICD 작업 없음.

## 변경 파일

- `src/cli/command-recovery.ts`
  - `optionRequiresValueMessage(command, optionName)` 추가.
- `src/cli/index.ts`
  - 값 누락 option error 조립을 helper 호출로 교체.
- `tests/cli-command-recovery-extra.test.ts`
  - missing option value recovery wording 단위 테스트 추가.

## 검증

- Red test 확인: helper 추가 전 `optionRequiresValueMessage is not a function` 실패 확인.
- `npm run build`: 통과.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose`: 2 files, 51 tests 통과.
- CLI smoke: `node dist/cli/index.js login --api-base-url` exit 1, stderr에 `--api-base-url requires a value.`와 `Run: agentfeed login --help` 확인.
- `npm test -- --run`: 50 files, 661 tests 통과.
- `git diff --check`: 통과.
- strict grep: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LSP diagnostics: `typescript-language-server` 미설치로 실행 불가.

## 크기 / 경계

- `src/cli/command-recovery.ts`: 135 pure LOC.
- `tests/cli-command-recovery-extra.test.ts`: 122 pure LOC.
- `src/cli/index.ts`: 2849 pure LOC, inherited oversized entrypoint defect는 남아 있으나 이번 slice에서 inline recovery responsibility를 추가로 제거했다.

## 후속 후보

- `--flag=value` 형태에서 flag가 값을 받지 않는 경우의 recovery helper 추출.
- `validateCommandArgs()`의 conflict/unknown option branch도 behavior lock 후 message helper로 계속 분리.
