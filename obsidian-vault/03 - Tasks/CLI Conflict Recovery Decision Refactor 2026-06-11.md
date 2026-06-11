---
title: CLI Conflict Recovery Decision Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
---

# CLI Conflict Recovery Decision Refactor 2026-06-11

## 결과

`agentfeed share --dry --yes`처럼 상호 배타적인 options가 함께 들어올 때의 conflict detection + recovery message 결정을 `conflictingOptionsMessage()`로 분리했다.

- Parser boundary: `src/cli/index.ts`의 `validateCommandArgs()`는 seen options 수집 후 conflict helper 결과만 처리한다.
- Recovery boundary: `src/cli/command-recovery.ts`가 conflict pair 순회와 command-specific recovery text 조립을 담당한다.
- Contract: CLI-Frontend-Backend API/response 계약 변경 없음.
- Scope: 서버, 배포, infra, CICD 작업 없음.

## 변경 파일

- `src/cli/command-recovery.ts`
  - `conflictingOptionsMessage(command, seenOptions, conflicts)` 추가.
- `src/cli/index.ts`
  - conflict pair 순회와 message assembly를 helper 호출로 교체.
- `tests/cli-command-recovery-extra.test.ts`
  - first matching conflict와 no-conflict null case 단위 테스트 추가.

## 검증

- Red test 확인: helper 추가 전 `conflictingOptionsMessage is not a function` 실패 확인.
- `npm run build`: 통과.
- `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose`: 2 files, 53 tests 통과.
- CLI smoke: `node dist/cli/index.js share --dry --yes` exit 1, stderr에 conflict message / `Use only one of --dry or --yes.` / `Run: agentfeed share --help` 확인.
- `npm test -- --run`: 50 files, 663 tests 통과.
- `git diff --check`: 통과.
- strict grep: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LSP diagnostics: `typescript-language-server` 미설치로 실행 불가.

## 크기 / 경계

- `src/cli/command-recovery.ts`: 148 pure LOC.
- `tests/cli-command-recovery-extra.test.ts`: 137 pure LOC.
- `src/cli/index.ts`: 2846 pure LOC, inherited oversized entrypoint defect는 남아 있으나 이번 slice에서 conflict recovery decision responsibility를 제거했다.

## 후속 후보

- `unknownOptionError()` 후보 계산을 command spec query helper로 분리.
- `validateCommandArgs()`의 long-option parsing 결과를 typed parser result로 나눠 command entrypoint의 branch 밀도를 더 줄인다.
