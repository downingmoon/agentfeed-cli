---
title: CLI Completion Option Metadata Split 2026-06-12
aliases:
  - CLI completion option metadata helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Completion Option Metadata Split 2026-06-12

> [!success] 결과
> completion option description, value requirement, value placeholder, value choice, file-value hint metadata를 `createCompletionOptionMetadata` helper로 분리했다. zsh/fish completion script와 `commands --json` option detail 계약은 변경하지 않았다.

## 변경 파일

- `src/cli/completion-option-metadata.ts`
  - option description override, value requirement lookup, placeholder, choices, file-valued option hint를 단일 metadata boundary로 이동.
- `src/cli/index.ts`
  - inline completion option metadata constants/functions를 제거하고 `COMPLETION_OPTION_METADATA`로 위임.
- `tests/completion-option-metadata.test.ts`
  - command-specific description override, generic description fallback, value requirement, placeholder, choices, file option 판정을 red → green으로 고정.

## 검증

- Red test: `npx vitest run tests/completion-option-metadata.test.ts --reporter=verbose`가 구현 전 모듈 부재로 실패함을 확인.
- `npm run build` 통과.
- Focused Vitest: `tests/completion-option-metadata.test.ts`, `tests/cli-help.test.ts` — 2 files / 39 tests 통과.
- Full suite: `npm test -- --run` — 66 files / 690 tests 통과.
- CLI smoke:
  - `node dist/cli/index.js completion zsh`에서 `--api-base-url`, `--source` choices, `--path` file hint, completion shell words 확인.
  - `node dist/cli/index.js completion fish`에서 `--source` choices 및 `--path -F` file hint 확인.
  - `node dist/cli/index.js commands --json`에서 `--source` option detail과 `--path` option detail 확인.
- `git diff --check` 통과.
- no-excuse checker: `NODE_PATH="$PWD/node_modules" bun run .../check-no-excuse-rules.ts src/cli/index.ts src/cli/completion-option-metadata.ts tests/completion-option-metadata.test.ts` — 3 files no violations.
- strict grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LOC:
  - `src/cli/index.ts`: 2697 pure LOC, inherited oversized defect이며 이번 slice에서 2816에서 감소.
  - `src/cli/completion-option-metadata.ts`: 141 pure LOC.
  - `tests/completion-option-metadata.test.ts`: 27 pure LOC.
- LSP diagnostics: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 없음. 기존 completion/catalog option metadata 계약 보존.

## 다음 후속

- `src/cli/index.ts`의 oversized defect를 계속 behavior-locked extraction으로 줄인다.
- 다음 후보는 zsh/bash/fish completion script rendering helper 또는 command catalog entry formatting boundary다.
