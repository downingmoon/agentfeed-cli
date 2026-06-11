---
title: CLI Conflict Validation Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
status: done
---

# CLI Conflict Validation Refactor 2026-06-11

> [!success]
> `validateCommandArgs`의 post-loop conflict validation throw boundary를 `assertNoConflictingOptions`로 분리했다.

## 변경 범위

- `src/cli/conflict-validation.ts`
  - `conflictingOptionsMessage` 결과를 throw하는 focused helper 추가.
- `src/cli/index.ts`
  - `conflictingOptionsMessage` 직접 import와 inline throw block 제거.
  - `assertNoConflictingOptions({ command, seenOptions, conflicts })`로 위임.
- `tests/conflict-validation.test.ts`
  - conflict 미발생/발생 case를 behavior test로 잠금.

## 검증 evidence

- Red: `npx vitest run tests/conflict-validation.test.ts --reporter=verbose`
  - helper module 미존재로 실패 확인.
- Build: `npm run build` 통과.
- Focused: `npx vitest run tests/conflict-validation.test.ts tests/positional-validation.test.ts tests/cli-help.test.ts --reporter=verbose`
  - 3 files, 42 tests 통과.
- CLI smoke: `node dist/cli/index.js share --dry --yes`
  - exit 1.
  - stderr: `Conflicting options for share: --dry and --yes`, `Run: agentfeed share --help`.
- Full: `npm test -- --run`
  - 55 files, 676 tests 통과.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
- LOC:
  - `src/cli/index.ts`: 2838 pure LOC, inherited oversized defect.
  - `src/cli/conflict-validation.ts`: 10 pure LOC.
  - `tests/conflict-validation.test.ts`: 20 pure LOC.
- LSP: `typescript-language-server` 미설치로 diagnostics 실행 불가.

## Enterprise constraints

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.
- CLI parser의 기존 conflict recovery behavior만 보존하며 내부 책임을 축소.

## 다음 후보

- positional accumulation helper extraction.
- long option policy decision helper.
- command arg spec query/helper split.
