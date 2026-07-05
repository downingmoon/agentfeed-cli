---
title: CLI Command Help Text Split 2026-06-12
aliases:
  - CLI command-specific help text helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Command Help Text Split 2026-06-12

## 결과

`src/cli/index.ts` 내부에 있던 command-specific help text map을 dedicated help text boundary로 분리했다.

- `src/cli/command-help-core-text.ts`: token/help/commands/version/init/login/logout/status/rotate help text
- `src/cli/command-help-workflow-text.ts`: collect/share/preview/publish/scan/doctor/drafts/discard/open/completion help text
- `src/cli/command-help-text.ts`: `commandHelpText(command)` facade

`index.ts`는 이제 `printCommandHelp(command)`에서 help text를 lookup한 뒤 출력만 수행한다. 모든 새 source/test 파일은 250 pure LOC 아래로 유지했다.

## 검증

- Red test: `npx vitest run tests/command-help-text.test.ts --reporter=verbose`가 구현 전 missing module로 실패함을 확인
- `npm run build` 통과
- Focused Vitest: `npx vitest run tests/command-help-text.test.ts tests/cli-help.test.ts --reporter=verbose` — 2 files / 41 tests 통과
- Full Vitest: `npm test -- --run` — 73 files / 706 tests 통과
- CLI smoke: `node dist/cli/index.js help token rotate`에서 token compatibility help 확인
- CLI smoke: `node dist/cli/index.js share --help`에서 share help 핵심 옵션/예시 확인
- CLI smoke: `node dist/cli/index.js completion --help`에서 supported shell/install guidance 확인
- `git diff --check` 통과
- no-excuse checker: `src/cli/index.ts`, `src/cli/command-help-text.ts`, `src/cli/command-help-core-text.ts`, `src/cli/command-help-workflow-text.ts`, `tests/command-help-text.test.ts` 통과
- strict grep: `any`, `as unknown`, ts-ignore/expect-error, empty catch, enum, non-null assertion 금지 패턴 미검출
- LSP diagnostics: `typescript-language-server` 미설치/이전 거절 상태라 실행 불가

## 범위 제한

- 서버/배포/infra/CICD 작업 없음
- CLI-Frontend-Backend 계약 변경 없음
- 새 기능 추가 없음
- command-specific help content boundary 이동 및 behavior lock test만 추가

## 다음 후보

- `src/cli/index.ts`의 root help rendering 또는 command dispatch switch를 behavior-lock test와 CLI smoke를 유지하면서 계속 분리한다.
