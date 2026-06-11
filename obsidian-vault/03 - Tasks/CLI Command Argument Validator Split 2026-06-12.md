---
title: CLI Command Argument Validator Split 2026-06-12
aliases:
  - CLI parser validation helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Command Argument Validator Split 2026-06-12

## 결과

`src/cli/index.ts`에 남아 있던 command argument validation loop를 `src/cli/command-argument-validator.ts`로 분리했다.

- unknown command recovery
- bare `--` sentinel rejection
- long option token parsing/consumption
- short option validation
- positional validation callbacks
- conflict validation

이제 `index.ts`는 command dispatch 전 `validateCommandArgs(command, args)`를 호출만 하고, parser validation details는 dedicated helper가 소유한다.

## 검증

- Red test: `npx vitest run tests/command-argument-validator.test.ts --reporter=verbose`가 구현 전 missing module로 실패함을 확인
- `npm run build` 통과
- Focused Vitest: `npx vitest run tests/command-argument-validator.test.ts tests/cli-help.test.ts --reporter=verbose` — 2 files / 41 tests 통과
- Full Vitest: `npm test -- --run` — 72 files / 703 tests 통과
- CLI smoke: `node dist/cli/index.js share --dry --yes`에서 conflict recovery 확인
- CLI smoke: `node dist/cli/index.js share --opne-review`에서 unknown option suggestion 확인
- CLI smoke: `node dist/cli/index.js token rotate browser`에서 compatibility alias positional recovery 확인
- `git diff --check` 통과
- no-excuse checker: `src/cli/index.ts`, `src/cli/command-argument-validator.ts`, `tests/command-argument-validator.test.ts` 통과
- strict grep: `any`, `as unknown`, ts-ignore/expect-error, empty catch, enum, non-null assertion 금지 패턴 미검출
- LSP diagnostics: `typescript-language-server` 미설치/이전 거절 상태라 실행 불가

## 범위 제한

- 서버/배포/infra/CICD 작업 없음
- CLI-Frontend-Backend 계약 변경 없음
- 새 기능 추가 없음
- parser validation boundary 이동 및 behavior lock test만 추가

## 다음 후보

- `src/cli/index.ts`의 help rendering 또는 command dispatch execution 책임을 behavior-lock test와 CLI smoke를 유지하면서 계속 분리한다.
