---
title: CLI Command Catalog Helper Split 2026-06-12
aliases:
  - CLI command catalog helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Command Catalog Helper Split 2026-06-12

> [!success] 결과
> `commands --json` command entry, option detail, conflict, completion word formatting을 `createCommandCatalog` helper로 분리했다. public command catalog JSON 계약은 변경하지 않았다.

## 변경 파일

- `src/cli/command-catalog.ts`
  - command definition + arg spec + completion vocabulary + option metadata를 조합해 JSON-facing catalog entry를 생성하는 helper 추가.
- `src/cli/index.ts`
  - inline `CommandOptionDetail`, `commandOptionDetails`, `commandCatalogEntry` 책임을 제거하고 `COMMAND_CATALOG.entryFor(...)`로 위임.
- `tests/command-catalog.test.ts`
  - usage default/override, help/example command, flags/value options, option details, conflicts, completion words를 red → green으로 고정.

## 검증

- Red test: `npx vitest run tests/command-catalog.test.ts --reporter=verbose`가 구현 전 모듈 부재로 실패함을 확인.
- `npm run build` 통과.
- Focused Vitest: `tests/command-catalog.test.ts`, `tests/cli-help.test.ts` — 2 files / 40 tests 통과.
- Full suite: `npm test -- --run` — 68 files / 693 tests 통과.
- CLI smoke:
  - `node dist/cli/index.js commands --json`에서 group list, `share` usage/help/example/source option detail/conflicts/completion words 확인.
  - `commands` entry의 `--json` option detail과 `completion` entry의 `agentfeed completion <shell>` usage 및 shell completion words 확인.
- `git diff --check` 통과.
- no-excuse checker: `NODE_PATH="$PWD/node_modules" bun run .../check-no-excuse-rules.ts src/cli/index.ts src/cli/command-catalog.ts tests/command-catalog.test.ts` — 3 files no violations.
- strict grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LOC:
  - `src/cli/index.ts`: 2551 pure LOC, inherited oversized defect이며 이번 slice에서 2589에서 감소.
  - `src/cli/command-catalog.ts`: 73 pure LOC.
  - `tests/command-catalog.test.ts`: 74 pure LOC.
- LSP diagnostics: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 없음. 기존 `commands --json` catalog 계약 보존.

## 다음 후속

- `src/cli/index.ts`의 oversized defect를 계속 behavior-locked extraction으로 줄인다.
- 다음 후보는 completion positional validation/spec boundary 또는 command workflow/catalog human rendering boundary다.
