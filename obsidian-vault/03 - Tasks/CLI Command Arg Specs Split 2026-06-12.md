---
title: CLI Command Arg Specs Split 2026-06-12
aliases:
  - CLI command argument specs helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Command Arg Specs Split 2026-06-12

## 결과

`src/cli/index.ts`에 남아 있던 command parser metadata를 `src/cli/command-arg-specs.ts`로 분리했다.

- command별 boolean flags
- value options
- conflict pairs
- positional validation/recovery callbacks
- completion command의 supported shell list

이 helper는 parser validation, completion vocabulary, command catalog JSON이 공유하는 argument contract의 단일 소스가 된다.

## 검증

- Red test: `npx vitest run tests/command-arg-specs.test.ts --reporter=verbose`가 구현 전 missing module로 실패함을 확인
- `npm run build` 통과
- Focused Vitest: `npx vitest run tests/command-arg-specs.test.ts tests/cli-help.test.ts --reporter=verbose` — 2 files / 41 tests 통과
- Full Vitest: `npm test -- --run` — 71 files / 700 tests 통과
- CLI smoke: `node dist/cli/index.js commands --json`에서 `share --note`, clipboard conflict, completion words 확인
- CLI smoke: `node dist/cli/index.js completion zsh`에서 zsh script의 `--note`, `--settings-path`, completion shell words 확인
- CLI smoke: `node dist/cli/index.js token rotate browser`에서 compatibility alias positional recovery 확인
- `git diff --check` 통과
- no-excuse checker: `src/cli/index.ts`, `src/cli/command-arg-specs.ts`, `tests/command-arg-specs.test.ts` 통과
- strict grep: `any`, `as unknown`, ts-ignore/expect-error, empty catch, enum, non-null assertion 금지 패턴 미검출
- LSP diagnostics: `typescript-language-server` 미설치/이전 거절 상태라 실행 불가

## 범위 제한

- 서버/배포/infra/CICD 작업 없음
- CLI-Frontend-Backend 계약 변경 없음
- 새 기능 추가 없음
- parser/help/completion/catalog가 이미 쓰던 argument metadata boundary만 이동

## 다음 후보

- `src/cli/index.ts`의 command handler execution과 help rendering 잔여 책임을 behavior-lock test와 CLI smoke를 유지하면서 계속 분리한다.
