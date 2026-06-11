---
title: CLI Positional Validation Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - enterprise-readiness
---

# CLI Positional Validation Refactor 2026-06-11

> [!success] 결론
> command positional validation 결과를 throw하는 책임을 `assertValidPositionals`로 분리했다. command별 `validatePositionals` message 계약은 유지하면서 `validateCommandArgs`의 post-loop validation branch를 더 작은 module로 이동했다.

## 변경 파일

- `src/cli/positional-validation.ts`
  - optional positional validator 실행.
  - validator가 recovery message를 반환하면 `Error`로 throw.
- `src/cli/index.ts`
  - inline positional error extraction/throw 제거.
  - `assertValidPositionals({ positionals, validatePositionals: spec.validatePositionals })` 호출로 교체.
- `tests/positional-validation.test.ts`
  - validator 없음, validator success, validator failure를 unit test로 고정.

## 검증

- Red: `npx vitest run tests/positional-validation.test.ts --reporter=verbose`
  - helper 파일 미존재로 실패 확인.
- Green/focused:
  - `npm run build` 통과.
  - `npx vitest run tests/positional-validation.test.ts tests/flag-option-consumption.test.ts tests/cli-help.test.ts --reporter=verbose` 통과: 44 tests.
- CLI smoke:
  - `node dist/cli/index.js status extra` → exit 1.
  - stderr: `Unexpected argument for status: extra`, `Run: agentfeed status --help`.
- Full regression:
  - `npm test -- --run` 통과: 54 files, 674 tests.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
  - LOC: `src/cli/index.ts` 2838, `src/cli/positional-validation.ts` 8, `tests/positional-validation.test.ts` 17.
- LSP:
  - MCP LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가.

## 경계

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.

## 다음 후보

- positional accumulation helper extraction.
- long option policy decision helper extraction.
- command arg spec query/helper split.
