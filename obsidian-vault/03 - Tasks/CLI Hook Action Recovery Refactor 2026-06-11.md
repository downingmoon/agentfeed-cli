---
title: CLI Hook Action Recovery Refactor 2026-06-11
date: 2026-06-11
status: completed
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
---

# CLI Hook Action Recovery Refactor 2026-06-11

## 결론

CLI `hook` 명령의 알 수 없는 action 복구 메시지를 `src/cli/index.ts` inline 로직에서 `src/cli/command-recovery.ts`로 분리했다. 동작은 유지하면서 `index.ts`의 command argument validation 책임을 더 줄였다.

## 변경

- `src/cli/command-recovery.ts`
  - `unknownHookActionMessage(action, supportedActions)` 추가.
  - action typo일 때 `agentfeed hook install claude-code` 제안을 생성한다.
  - 멀리 떨어진 action에는 suggestion 없이 usage와 recovery command만 보여준다.
- `src/cli/index.ts`
  - `hook.validatePositionals`의 inline closest-match/recovery 문자열 조합 제거.
  - `unknownHookActionMessage` 호출로 위임.
- `tests/cli-command-recovery-extra.test.ts`
  - `instal` typo suggestion과 `enable` no-suggestion 경로를 고정.

## 검증 Evidence

- Red test 확인: `npx vitest run tests/cli-command-recovery-extra.test.ts --reporter=verbose`가 `unknownHookActionMessage is not a function`으로 실패.
- Focused regression: `npx vitest run tests/cli-command-recovery-extra.test.ts tests/cli-help.test.ts --reporter=verbose` 통과, 2 files / 43 tests.
- Build: `npm run build` 통과.
- CLI surface smoke: `node dist/cli/index.js hook instal claude-code`가 exit 1로 실패하며 다음을 stderr에 출력.
  - `Unknown hook action: instal`
  - `Did you mean: agentfeed hook install claude-code`
  - `Usage: agentfeed hook install|uninstall claude-code`
- Full regression: `npm test -- --run` 통과, 50 files / 653 tests.
- Diff hygiene: `git diff --check` 통과.
- Strict grep: touched TS/test files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 패턴 없음.

> [!warning] LSP diagnostics
> `typescript-language-server`가 설치되어 있지 않아 MCP LSP diagnostics는 실행 불가했다. 이번 slice는 `tsc` build와 Vitest 회귀로 대체 검증했다.

## LOC / 구조 점검

- `src/cli/index.ts`: 2870 pure LOC. 여전히 inherited oversized defect이며 이번 slice에서 6 LOC 감소.
- `src/cli/command-recovery.ts`: 79 pure LOC, 단일 책임은 CLI recovery message formatting.
- `tests/cli-command-recovery-extra.test.ts`: 61 pure LOC, 단일 책임은 command recovery message contract 고정.

## 다음 후보

- `src/cli/index.ts`의 flagless positional option suggestion helper를 더 작은 recovery module로 분리.
- `COMMAND_ARG_SPECS` 자체를 command별 spec module로 쪼개는 장기 리팩터링은 영향 범위가 더 커서 별도 behavior-lock 이후 진행.
