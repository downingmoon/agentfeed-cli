---
title: CLI Token Recovery Refactor 2026-06-11
date: 2026-06-11
status: completed
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
---

# CLI Token Recovery Refactor 2026-06-11

## 결론

CLI `token` compatibility alias의 usage/unknown subcommand 복구 메시지를 `src/cli/index.ts` inline 문자열 조합에서 `src/cli/command-recovery.ts` helper로 분리했다. 신규 기능은 추가하지 않았고, 기존 `agentfeed token rotate` alias UX를 그대로 유지했다.

## 변경

- `src/cli/command-recovery.ts`
  - `tokenUsageMessage()` 추가.
  - `unknownTokenSubcommandMessage(subcommand)` 추가.
- `src/cli/index.ts`
  - `token.validatePositionals`의 token-specific usage/unknown 문자열 조합을 helper 호출로 위임.
- `tests/cli-command-recovery-extra.test.ts`
  - token usage와 unknown subcommand recovery 메시지를 단위 테스트로 고정.

## 검증 Evidence

- Red test 확인: `npx vitest run tests/cli-command-recovery-extra.test.ts --reporter=verbose`가 `tokenUsageMessage is not a function`으로 실패.
- Build: `npm run build` 통과.
- Focused regression: `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` 통과, 2 files / 45 tests.
- CLI surface smoke: `node dist/cli/index.js token rotat`가 exit 1로 실패하며 다음을 stderr에 출력.
  - `Unknown token subcommand: rotat`
  - `Run: agentfeed token rotate --help`
- Full regression: `npm test -- --run` 통과, 50 files / 655 tests.
- Diff hygiene: `git diff --check` 통과.
- Strict grep: touched TS/test files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 패턴 없음.

> [!warning] LSP diagnostics
> `typescript-language-server`가 설치되어 있지 않아 MCP LSP diagnostics는 실행 불가했다. 이번 slice는 `tsc` build와 Vitest 회귀로 대체 검증했다.

## LOC / 구조 점검

- `src/cli/index.ts`: 2854 pure LOC. 이번 slice에서 LOC는 유지됐지만 token-specific recovery 표현 책임을 helper로 이동했다.
- `src/cli/command-recovery.ts`: 114 pure LOC, 단일 책임은 CLI recovery message formatting.
- `tests/cli-command-recovery-extra.test.ts`: 81 pure LOC, 단일 책임은 command recovery message contract 고정.

## 다음 후보

- `help` command positional recovery 메시지 분리.
- `completion` command positional recovery 메시지 분리.
- 이후 `COMMAND_ARG_SPECS` 자체를 command group별 module로 나누기 전, command-specific recovery helpers를 더 줄인다.
