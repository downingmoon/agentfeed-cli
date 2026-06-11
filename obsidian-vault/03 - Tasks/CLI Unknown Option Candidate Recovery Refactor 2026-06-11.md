---
title: CLI Unknown Option Candidate Recovery Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
---

# CLI Unknown Option Candidate Recovery Refactor 2026-06-11

## 결과

`agentfeed share --opne-review`처럼 unknown option이 들어올 때 suggestion 후보(`flags + valueOptions + --help/-h`)를 조립하는 책임을 `unknownCommandOptionMessage()`로 분리했다.

- Parser boundary: `src/cli/index.ts`의 `unknownOptionError()`는 command spec에서 flags/valueOptions를 넘기는 thin wrapper만 담당한다.
- Recovery boundary: `src/cli/command-recovery.ts`가 unknown option candidate assembly와 command-specific recovery text 조립을 담당한다.
- Contract: CLI-Frontend-Backend API/response 계약 변경 없음.
- Scope: 서버, 배포, infra, CICD 작업 없음.

## 변경 파일

- `src/cli/command-recovery.ts`
  - `unknownCommandOptionMessage(command, optionName, flags, valueOptions)` 추가.
- `src/cli/index.ts`
  - unknown option candidate list 조립을 helper 호출로 교체.
- `tests/cli-command-recovery-extra.test.ts`
  - flag/value-option 후보에서 closest suggestion을 계산하는 단위 테스트 추가.

## 검증

- Red test 확인: helper 추가 전 `unknownCommandOptionMessage is not a function` 실패 확인.
- `npm run build`: 통과.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose`: 2 files, 54 tests 통과.
- CLI smoke: `node dist/cli/index.js share --opne-review` exit 1, stderr에 unknown option / command / `Did you mean: --open-review` / help hint 확인.
- `npm test -- --run`: 50 files, 664 tests 통과.
- `git diff --check`: 통과.
- strict grep: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LSP diagnostics: `typescript-language-server` 미설치로 실행 불가.

## 크기 / 경계

- `src/cli/command-recovery.ts`: 156 pure LOC.
- `tests/cli-command-recovery-extra.test.ts`: 145 pure LOC.
- `src/cli/index.ts`: 2845 pure LOC, inherited oversized entrypoint defect는 남아 있으나 이번 slice에서 unknown option candidate assembly responsibility를 제거했다.

## 후속 후보

- `validateCommandArgs()`의 long option parsing을 typed parse result로 분리해 `raw.indexOf('=')` branch를 entrypoint 밖으로 이동.
- `COMMAND_ARG_SPECS` query helpers를 별도 parser module로 분리해 command metadata와 parser validation 경계를 명확히 한다.
