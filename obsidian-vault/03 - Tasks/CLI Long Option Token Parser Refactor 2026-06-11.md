---
title: CLI Long Option Token Parser Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - enterprise-readiness
---

# CLI Long Option Token Parser Refactor 2026-06-11

> [!success] 결론
> `validateCommandArgs` 안에 섞여 있던 raw long option token parsing(`--name[=value]`)을 `parseLongOptionToken` helper로 분리했다. CLI command policy는 typed token을 소비하고, inline slicing 책임은 새 focused module로 이동했다.

## 변경 파일

- `src/cli/long-option-token.ts`
  - `{ name, inlineValue }` 형태의 `LongOptionToken` parser 추가.
- `src/cli/index.ts`
  - `equalsIndex`/`slice` 기반 inline parsing 제거.
  - `validateCommandArgs`가 typed token을 사용하도록 변경.
- `tests/long-option-token.test.ts`
  - bare long option, inline value, empty inline value를 unit test로 고정.

## 검증

- Red: `npx vitest run tests/long-option-token.test.ts --reporter=verbose`
  - helper 파일 미존재로 실패 확인.
- Green/focused:
  - `npm run build` 통과.
  - `npx vitest run tests/long-option-token.test.ts tests/cli-help.test.ts --reporter=verbose` 통과: 39 tests.
- CLI smoke:
  - `node dist/cli/index.js login --api-base-url=` → exit 1.
  - stderr: `--api-base-url requires a value.` / `Run: agentfeed login --help`.
- Full regression:
  - `npm test -- --run` 통과: 51 files, 665 tests.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
  - LOC: `src/cli/long-option-token.ts` 9, `tests/long-option-token.test.ts` 12.
  - `src/cli/index.ts`는 inherited oversized defect(2846 pure LOC)이나 이번 slice에서 token parsing 책임을 더 작은 module로 분리해 감소 방향을 유지했다.
- LSP:
  - MCP LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가.

## 경계

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.

## 다음 후보

- value-option validation result extraction.
- command arg spec query/helper split.
- `validateCommandArgs` 내부 positional/conflict policy를 추가 focused module로 분리.
