---
title: CLI Human Command Catalog Renderer Split 2026-06-12
aliases:
  - CLI human command catalog renderer helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Human Command Catalog Renderer Split 2026-06-12

> [!success] 결과
> human-readable command catalog와 guided workflow line rendering을 `command-catalog-renderer` helper로 분리했다. `agentfeed commands`와 root help의 operator-facing 출력 계약은 변경하지 않았다.

## 변경 파일

- `src/cli/command-catalog-renderer.ts`
  - grouped command catalog lines, guided workflow lines, `COMMAND_WORKFLOWS` data를 UI formatter 주입 방식의 pure boundary로 이동.
- `src/cli/index.ts`
  - `printCommandCatalog` / `printCommandWorkflows`를 renderer 위임으로 축소하고 workflow data를 entrypoint에서 제거.
- `tests/command-catalog-renderer.test.ts`
  - group heading, padded command names, descriptions, workflow summary/commands line shape를 red → green으로 고정.

## 검증

- Red test: `npx vitest run tests/command-catalog-renderer.test.ts --reporter=verbose`가 구현 전 모듈 부재로 실패함을 확인.
- `npm run build` 통과.
- Focused Vitest: `tests/command-catalog-renderer.test.ts`, `tests/cli-help.test.ts` — 2 files / 40 tests 통과.
- Full suite: `npm test -- --run` — 69 files / 695 tests 통과.
- CLI smoke:
  - `node dist/cli/index.js commands`에서 Commands/Start/Guided workflows/Try this/footer 출력 확인.
  - `node dist/cli/index.js --help`에서 root help command catalog와 footer 출력 확인.
- `git diff --check` 통과.
- no-excuse checker: `NODE_PATH="$PWD/node_modules" bun run .../check-no-excuse-rules.ts src/cli/index.ts src/cli/command-catalog-renderer.ts tests/command-catalog-renderer.test.ts` — 3 files no violations.
- strict grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum`, non-null assertion 없음.
- LOC:
  - `src/cli/index.ts`: 2524 pure LOC, inherited oversized defect이며 이번 slice에서 2551에서 감소.
  - `src/cli/command-catalog-renderer.ts`: 66 pure LOC.
  - `tests/command-catalog-renderer.test.ts`: 46 pure LOC.
- LSP diagnostics: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 없음. 기존 human-readable command catalog/help 출력 계약 보존.

## 다음 후속

- `src/cli/index.ts`의 oversized defect를 계속 behavior-locked extraction으로 줄인다.
- 다음 후보는 completion positional validation/spec boundary 또는 help text rendering boundary다.
