---
title: CLI Completion Command Split 2026-06-12
aliases:
  - CLI completion command helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Completion Command Split 2026-06-12

> [!summary]
> `agentfeed completion`의 help/script/unsupported-shell 결정 로직을 `src/cli/completion-command.ts`로 분리해 `src/cli/index.ts`의 shell completion command wrapper 책임을 줄였다.

## 변경
- `completionCommandResult` helper를 추가해 shell 미지정(help), supported shell(script), unsupported shell(recovery error) 결과를 discriminated union으로 고정했다.
- `cmdCompletion`은 helper 결과를 출력으로 연결하는 orchestration만 담당하도록 축소했다.
- unsupported shell recovery wording은 기존 `unsupportedCompletionShellMessage`를 그대로 사용해 CLI observable output을 유지했다.

## 검증
- Red: `tests/completion-command.test.ts`가 `completion-command` 모듈 부재로 실패함을 확인.
- Green: `npm run build` 통과.
- Focused: `npx vitest run tests/completion-command.test.ts tests/cli-help.test.ts tests/completion-script-renderer.test.ts --reporter=verbose` 42 tests 통과.
- Full: `npm test -- --run` 77 files / 715 tests 통과.
- Smoke: `node dist/cli/index.js completion --help`, `completion zsh`, `completion powershell` recovery 확인.
- Static: `git diff --check`, no-excuse checker, strict grep 통과.
- LSP: `typescript-language-server` 미설치로 실행 불가.

## 범위 제한
- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 feature 없음. `agentfeed completion` observable behavior는 유지하고 내부 command decision boundary만 분리했다.

## 후행 과제
- `src/cli/index.ts`는 여전히 2012 pure LOC로 과대하다. 다음 safe slice는 `cmdVersion` JSON/plain output 또는 draft list/open helper boundary를 테스트로 고정해 분리하는 것이다.
