---
title: CLI Flagless Option Recovery Refactor 2026-06-11
date: 2026-06-11
status: completed
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
---

# CLI Flagless Option Recovery Refactor 2026-06-11

## 결론

CLI 사용자가 `--yes` 대신 `yes`, `--open-review` 대신 `open-review`처럼 flag 이름을 positional argument로 입력했을 때의 복구 제안 생성 로직을 `src/cli/index.ts`에서 `src/cli/command-recovery.ts`로 분리했다. 기존 CLI UX는 유지하면서 oversized entrypoint의 책임을 줄였다.

## 변경

- `src/cli/command-recovery.ts`
  - `flaglessOptionSuggestionLines(command, positionals, flags, prefixPositionals)` 추가.
  - 지원되는 long flag만 bare-name 매칭 대상으로 삼는다.
  - `token rotate yes`처럼 prefix positional이 필요한 경로도 helper에서 포맷한다.
- `src/cli/index.ts`
  - `flaglessOptionCommandSuggestion` / `flaglessOptionSuggestionLine` inline Map/formatting 로직 제거.
  - command spec의 flags만 helper에 전달하는 얇은 adapter(`flaglessOptionSuggestionsFor`)만 남겼다.
- `tests/cli-command-recovery-extra.test.ts`
  - long flag 변환, prefix positional, unknown positional, empty positional 경로를 단위 테스트로 고정했다.

## 검증 Evidence

- Red test 확인: `npx vitest run tests/cli-command-recovery-extra.test.ts --reporter=verbose`가 `flaglessOptionSuggestionLines is not a function`으로 실패.
- Build: `npm run build` 통과.
- Focused unit: `npx vitest run tests/cli-command-recovery-extra.test.ts --reporter=verbose` 통과, 1 file / 6 tests.
- CLI help regression: `npx vitest run tests/cli-help.test.ts --reporter=verbose` 통과, 1 file / 38 tests.
- CLI surface smoke: `node dist/cli/index.js share yes open-review`가 exit 1로 실패하며 다음을 stderr에 출력.
  - `Unexpected argument for share: yes`
  - `Did you mean: agentfeed share --yes --open-review`
  - `Run: agentfeed share --help`
- Full regression: `npm test -- --run` 통과, 50 files / 654 tests.
- Diff hygiene: `git diff --check` 통과.
- Strict grep: touched TS/test files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 패턴 없음.

> [!warning] LSP diagnostics
> `typescript-language-server`가 설치되어 있지 않아 MCP LSP diagnostics는 실행 불가했다. 이번 slice는 `tsc` build와 Vitest 회귀로 대체 검증했다.

> [!warning] Local disk
> 전체 테스트 후 로컬 디스크 여유 공간이 약 128MiB까지 내려갔다. 다음 큰 작업 전에는 안전한 캐시/빌드 산출물 정리가 필요하다.

## LOC / 구조 점검

- `src/cli/index.ts`: 2854 pure LOC. 여전히 inherited oversized defect이며 이번 slice에서 16 LOC 감소.
- `src/cli/command-recovery.ts`: 108 pure LOC, 단일 책임은 CLI recovery message formatting.
- `tests/cli-command-recovery-extra.test.ts`: 71 pure LOC, 단일 책임은 command recovery message contract 고정.

## 다음 후보

- `COMMAND_ARG_SPECS`를 command group별 module로 분리하기 전, 각 command validation helper를 더 작은 behavior-locked slice로 분리한다.
- disk pressure 때문에 다음 slice 전 `dist`와 npm/vitest cache 상태를 먼저 확인한다.
