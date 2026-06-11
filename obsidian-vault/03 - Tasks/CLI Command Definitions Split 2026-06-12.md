---
title: CLI Command Definitions Split 2026-06-12
aliases:
  - CLI public command definitions helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Command Definitions Split 2026-06-12

## 결과

`src/cli/index.ts`에 남아 있던 public command metadata를 `src/cli/command-definitions.ts`로 분리했다.

- public command order
- command descriptions
- command examples
- usage overrides
- help/catalog command groups
- parser/recovery용 known-command set

`token`은 compatibility alias로 계속 known-command set에 남기되 public command catalog에는 노출하지 않는 계약을 `tests/command-definitions.test.ts`로 고정했다.

## 검증

- Red test: `npx vitest run tests/command-definitions.test.ts --reporter=verbose`가 구현 전 missing module로 실패함을 확인
- `npm run build` 통과
- Focused Vitest: `npx vitest run tests/command-definitions.test.ts tests/cli-help.test.ts --reporter=verbose` — 2 files / 40 tests 통과
- Full Vitest: `npm test -- --run` — 70 files / 697 tests 통과
- CLI smoke: `node dist/cli/index.js commands --json`에서 command groups/share description/completion usage/token 비노출 확인
- CLI smoke: `node dist/cli/index.js --help`에서 grouped help/completion/help guidance 확인
- `git diff --check` 통과
- no-excuse checker: `src/cli/index.ts`, `src/cli/command-definitions.ts`, `tests/command-definitions.test.ts` 통과
- strict grep: `any`, `as unknown`, ts-ignore/expect-error, empty catch, enum, non-null assertion 금지 패턴 미검출
- LSP diagnostics: `typescript-language-server` 미설치/이전 거절 상태라 실행 불가

## 범위 제한

- 서버/배포/infra/CICD 작업 없음
- CLI-Frontend-Backend 계약 변경 없음
- 새 기능 추가 없음
- 내부 metadata boundary 분리 및 behavior lock test만 추가

## 다음 후보

- `src/cli/index.ts`의 남은 oversized help/parser/command execution boundary를 동일한 방식으로 red test 후 cohesive helper 단위로 계속 축소한다.
