---
title: CLI Completion Script Renderer Split 2026-06-12
aliases:
  - CLI completion script renderer helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Completion Script Renderer Split 2026-06-12

> [!success] 결과
> zsh/bash/fish completion script rendering을 `createCompletionScriptRenderer` helper로 분리했다. `agentfeed completion <shell>`의 public script output 계약은 변경하지 않았다.

## 변경 파일

- `src/cli/completion-script-renderer.ts`
  - zsh option argument rendering, zsh/bash/fish script generation, shell dispatch를 shared vocabulary/metadata input 기반 helper로 이동.
- `src/cli/index.ts`
  - inline zsh/bash/fish rendering 함수들을 제거하고 `COMPLETION_SCRIPT_RENDERER`로 위임.
- `tests/completion-script-renderer.test.ts`
  - zsh choices, bash source completion, fish file hint, unsupported shell `undefined` fallback을 red → green으로 고정.

## 검증

- Red test: `npx vitest run tests/completion-script-renderer.test.ts --reporter=verbose`가 구현 전 모듈 부재로 실패함을 확인.
- `npm run build` 통과.
- Focused Vitest: `tests/completion-script-renderer.test.ts`, `tests/cli-help.test.ts` — 2 files / 39 tests 통과.
- Full suite: `npm test -- --run` — 67 files / 691 tests 통과.
- CLI smoke:
  - `node dist/cli/index.js completion zsh`에서 `#compdef`, completion shell words, source choices, session-file file hint 확인.
  - `node dist/cli/index.js completion bash`에서 source choices, file-valued option completion, completion shell options 확인.
  - `node dist/cli/index.js completion fish`에서 completion shell words, source choices, session-file `-F` file hint 확인.
- `git diff --check` 통과.
- no-excuse checker: `NODE_PATH="$PWD/node_modules" bun run .../check-no-excuse-rules.ts src/cli/index.ts src/cli/completion-script-renderer.ts tests/completion-script-renderer.test.ts` — 3 files no violations.
- strict grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LOC:
  - `src/cli/index.ts`: 2589 pure LOC, inherited oversized defect이며 이번 slice에서 2697에서 감소.
  - `src/cli/completion-script-renderer.ts`: 146 pure LOC.
  - `tests/completion-script-renderer.test.ts`: 41 pure LOC.
- LSP diagnostics: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 없음. 기존 completion script output 계약 보존.

## 다음 후속

- `src/cli/index.ts`의 oversized defect를 계속 behavior-locked extraction으로 줄인다.
- 다음 후보는 command catalog entry formatting 또는 completion validation/spec boundary다.
